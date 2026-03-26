#!/usr/bin/env python3
"""
Train Logistic Regression and Random Forest models on the creditcard dataset.
Uses scikit-learn for efficient training. Exports model parameters as JSON.
"""

import json
import sys
import os
import math
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from imblearn.over_sampling import SMOTE

def main():
    csv_path = os.path.join(os.path.dirname(__file__),
                            '..', 'attached_assets', 'creditcard_1773596331506.csv')
    csv_path = os.path.abspath(csv_path)

    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} rows. Fraud: {df['Class'].sum()}, Normal: {(df['Class']==0).sum()}")

    feature_cols = ['Time'] + [f'V{i}' for i in range(1, 29)] + ['Amount']
    X = df[feature_cols].values
    y = df['Class'].values

    # ─── Dataset Statistics ───────────────────────────────────────────────────
    print("Computing dataset statistics...")
    fraud_mask = y == 1
    normal_mask = y == 0

    # Hourly fraud trend (Time is in seconds, 48h window)
    df['hour_bucket'] = (df['Time'] // 3600).clip(0, 47).astype(int)
    hourly = df.groupby('hour_bucket').agg(
        total=('Class', 'count'),
        fraudCount=('Class', 'sum')
    ).reset_index()
    hourly['fraudRate'] = (hourly['fraudCount'] / hourly['total'] * 100).round(3)
    fraud_trend = hourly.rename(columns={'hour_bucket': 'hour'}).to_dict(orient='records')

    # V-feature distributions
    v_stats = []
    for vi in range(1, 29):
        col = f'V{vi}'
        fraud_vals = df.loc[fraud_mask, col]
        normal_vals = df.loc[normal_mask, col]
        v_stats.append({
            "feature": col,
            "fraud": {
                "mean": round(float(fraud_vals.mean()), 4),
                "std": round(float(fraud_vals.std()), 4),
                "min": round(float(fraud_vals.min()), 4),
                "max": round(float(fraud_vals.max()), 4),
            },
            "normal": {
                "mean": round(float(normal_vals.mean()), 4),
                "std": round(float(normal_vals.std()), 4),
                "min": round(float(normal_vals.min()), 4),
                "max": round(float(normal_vals.max()), 4),
            }
        })

    # Amount stats
    fraud_amounts = df.loc[fraud_mask, 'Amount']
    normal_amounts = df.loc[normal_mask, 'Amount']

    dataset_stats = {
        "totalTransactions": int(len(df)),
        "fraudCount": int(fraud_mask.sum()),
        "normalCount": int(normal_mask.sum()),
        "fraudRate": round(float(fraud_mask.mean() * 100), 3),
        "fraudTrend": [
            {"hour": int(r["hour"]), "total": int(r["total"]),
             "fraudCount": int(r["fraudCount"]), "fraudRate": float(r["fraudRate"])}
            for r in fraud_trend
        ],
        "vFeatureStats": v_stats,
        "amountStats": {
            "fraud": {
                "mean": round(float(fraud_amounts.mean()), 2),
                "max": round(float(fraud_amounts.max()), 2),
                "min": round(float(fraud_amounts.min()), 2),
            },
            "normal": {
                "mean": round(float(normal_amounts.mean()), 2),
                "max": round(float(normal_amounts.max()), 2),
                "min": round(float(normal_amounts.min()), 2),
            }
        }
    }

    # ─── Train / Test Split ───────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Applying SMOTE to balance the training dataset...")
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    print(f"SMOTE complete. New training shape: {X_train_res.shape}")

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train_res)
    X_test_s = scaler.transform(X_test)

    # ─── Logistic Regression ──────────────────────────────────────────────────
    print("Training Logistic Regression...")
    lr = LogisticRegression(max_iter=1000, C=0.1, solver='lbfgs')
    lr.fit(X_train_s, y_train_res)

    lr_probs = lr.predict_proba(X_test_s)[:, 1]
    lr_preds = (lr_probs >= 0.5).astype(int)
    lr_auc = roc_auc_score(y_test, lr_probs)
    lr_cm = confusion_matrix(y_test, lr_preds)
    lr_report = classification_report(y_test, lr_preds, output_dict=True)

    lr_weights = lr.coef_[0].tolist()
    lr_bias = float(lr.intercept_[0])
    lr_means = scaler.mean_.tolist()
    lr_stds = scaler.scale_.tolist()

    # Feature importance for LR = absolute coefficient values (normalized)
    abs_coefs = np.abs(lr.coef_[0])
    lr_fi = sorted(
        [{"feature": feature_cols[i], "importance": round(float(abs_coefs[i] / abs_coefs.sum()), 6)}
         for i in range(len(feature_cols))],
        key=lambda x: -x["importance"]
    )

    lr_metrics = {
        "accuracy": round(float(lr_report["accuracy"]), 4),
        "precision": round(float(lr_report["1"]["precision"]), 4),
        "recall": round(float(lr_report["1"]["recall"]), 4),
        "f1": round(float(lr_report["1"]["f1-score"]), 4),
        "auc": round(float(lr_auc), 4),
        "tp": int(lr_cm[1][1]), "fp": int(lr_cm[0][1]),
        "tn": int(lr_cm[0][0]), "fn": int(lr_cm[1][0]),
    }
    print(f"LR - AUC: {lr_metrics['auc']}, F1: {lr_metrics['f1']}, Recall: {lr_metrics['recall']}")

    # ─── Random Forest ────────────────────────────────────────────────────────
    print("Training Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=100, max_depth=10,
        n_jobs=-1, random_state=42, min_samples_split=10
    )
    rf.fit(X_train_res, y_train_res)

    rf_probs = rf.predict_proba(X_test)[:, 1]
    rf_preds = (rf_probs >= 0.5).astype(int)
    rf_auc = roc_auc_score(y_test, rf_probs)
    rf_cm = confusion_matrix(y_test, rf_preds)
    rf_report = classification_report(y_test, rf_preds, output_dict=True)

    # Feature importance
    rf_fi_raw = rf.feature_importances_
    rf_fi = sorted(
        [{"feature": feature_cols[i], "importance": round(float(rf_fi_raw[i]), 6)}
         for i in range(len(feature_cols))],
        key=lambda x: -x["importance"]
    )

    rf_metrics = {
        "accuracy": round(float(rf_report["accuracy"]), 4),
        "precision": round(float(rf_report["1"]["precision"]), 4),
        "recall": round(float(rf_report["1"]["recall"]), 4),
        "f1": round(float(rf_report["1"]["f1-score"]), 4),
        "auc": round(float(rf_auc), 4),
        "tp": int(rf_cm[1][1]), "fp": int(rf_cm[0][1]),
        "tn": int(rf_cm[0][0]), "fn": int(rf_cm[1][0]),
    }
    print(f"RF - AUC: {rf_metrics['auc']}, F1: {rf_metrics['f1']}, Recall: {rf_metrics['recall']}")

    # ─── Export RF trees as JSON (simplified, max 20 trees for file size) ─────
    print("Exporting Random Forest trees...")

    def export_tree(estimator, feature_names):
        tree = estimator.tree_
        def recurse(node_id):
            if tree.children_left[node_id] == -1:  # leaf
                vals = tree.value[node_id][0]
                total = sum(vals)
                prob = vals[1] / total if total > 0 else 0
                return {"leaf": True, "prob": round(float(prob), 4)}
            return {
                "leaf": False,
                "feature": int(tree.feature[node_id]),
                "threshold": round(float(tree.threshold[node_id]), 6),
                "left": recurse(int(tree.children_left[node_id])),
                "right": recurse(int(tree.children_right[node_id]))
            }
        return recurse(0)

    # Export first 20 trees (good accuracy/size tradeoff)
    exported_trees = [export_tree(est, feature_cols) for est in rf.estimators_[:20]]

    # ─── Save output ──────────────────────────────────────────────────────────
    output = {
        "logisticRegression": {
            "type": "logistic_regression",
            "weights": lr_weights,
            "bias": lr_bias,
            "scaler": {"means": lr_means, "stds": lr_stds},
            "featureImportance": lr_fi,
            "metrics": lr_metrics,
            "description": "Logistic Regression with balanced class weights, C=0.1, LBFGS solver"
        },
        "randomForest": {
            "type": "random_forest",
            "trees": exported_trees,
            "featureImportance": rf_fi,
            "metrics": rf_metrics,
            "description": "Random Forest (100 trees, max depth 10, balanced class weights)"
        },
        "datasetStats": dataset_stats
    }

    out_path = os.path.join(os.path.dirname(__file__),
                            '..', 'artifacts', 'api-server', 'src', 'lib', 'models.json')
    out_path = os.path.abspath(out_path)

    with open(out_path, 'w') as f:
        json.dump(output, f, separators=(',', ':'))

    size_kb = os.path.getsize(out_path) / 1024
    print(f"\nSaved to {out_path} ({size_kb:.1f} KB)")
    print("Training complete!")

if __name__ == '__main__':
    main()
