import pandas as pd
from database import engine
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error


def ejecutar_ia():

    fact = pd.read_sql(
        "SELECT * FROM fact_egresados",
        engine
    )

    uni = pd.read_sql(
        "SELECT * FROM dim_universidad",
        engine
    )

    prog = pd.read_sql(
        "SELECT * FROM dim_programa",
        engine
    )

    tiempo = pd.read_sql(
        "SELECT * FROM dim_tiempo",
        engine
    )

    # unir dimensiones al fact
    df = fact.merge(uni, on="id_universidad", how="left")
    df = df.merge(prog, on="id_programa", how="left")
    df = df.merge(tiempo, on="id_tiempo", how="left")

    if len(df) < 50:
        raise Exception(
            "Muy pocos datos para entrenar (mínimo 50 registros)"
        )

    df = df.dropna(subset=["promedio", "edad"])

    # Codificar tipo_gestion (pública/privada) como variable numérica
    if "tipo_gestion" in df.columns:
        df["tipo_gestion_cod"] = (
            df["tipo_gestion"]
            .astype(str)
            .str.upper()
            .str.strip()
            .map(lambda x: 1 if "PUBLICA" in x or "PÚBLICA" in x else 0)
        )
    else:
        df["tipo_gestion_cod"] = 0

    # Codificar licenciado
    if "licenciado" in df.columns:
        df["licenciado_cod"] = (
            df["licenciado"]
            .astype(str)
            .str.upper()
            .str.strip()
            .map(lambda x: 1 if x in ("SI", "SÍ", "1", "TRUE") else 0)
        )
    else:
        df["licenciado_cod"] = 0

    # Año de egreso
    anio_col = "anio" if "anio" in df.columns else None

    features = ["edad", "tipo_gestion_cod", "licenciado_cod"]

    if anio_col:
        df[anio_col] = pd.to_numeric(df[anio_col], errors="coerce").fillna(0)
        features.append(anio_col)

    X = df[features].fillna(0)
    y = df["promedio"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42
    )

    modelo = RandomForestRegressor(
        n_estimators=100,
        random_state=42
    )

    modelo.fit(X_train, y_train)

    pred = modelo.predict(X_test)

    score   = round(r2_score(y_test, pred), 3)
    mae     = round(mean_absolute_error(y_test, pred), 3)

    importancias = dict(
        zip(features, modelo.feature_importances_.round(3).tolist())
    )

    return {
        "score_r2":       score,
        "error_mae":      mae,
        "features":       features,
        "importancias":   importancias,
        "predicciones":   pred[:10].tolist()
    }
