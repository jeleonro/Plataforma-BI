import pandas as pd
from database import engine
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error, accuracy_score

def ejecutar_ia():

    # ======================
    # CARGAR TABLAS
    # ======================

    fact = pd.read_sql("SELECT * FROM fact_egresados", engine)
    uni = pd.read_sql("SELECT * FROM dim_universidad", engine)
    prog = pd.read_sql("SELECT * FROM dim_programa", engine)
    tiempo = pd.read_sql("SELECT * FROM dim_tiempo", engine)

    df = fact.merge(uni, on="id_universidad")
    df = df.merge(prog, on="id_programa")
    df = df.merge(tiempo, on="id_tiempo")

    df = df.dropna(subset=["promedio", "edad"])

    # ======================
    # CODIFICAR VARIABLES
    # ======================

    df["tipo_gestion_cod"] = df["tipo_gestion"].astype(str).str.upper().apply(
        lambda x: 1 if "PUBLICA" in x or "PÚBLICA" in x else 0
    )

    df["licenciado_cod"] = df["licenciado"].astype(str).str.upper().apply(
        lambda x: 1 if x in ["SI", "SÍ"] else 0
    )

    X = df[["edad", "tipo_gestion_cod", "licenciado_cod", "anio"]]
    y = df["promedio"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # ==========================================
    # 1. PREDICCIÓN PROMEDIO
    # ==========================================

    modelo = RandomForestRegressor(random_state=42)

    modelo.fit(X_train, y_train)

    pred = modelo.predict(X_test)

    promedio = pd.DataFrame({
        "Promedio_Real": y_test.values,
        "Promedio_Predicho": pred
    })

    promedio.to_csv("predicciones_promedio.csv", index=False)

    print("R2:", r2_score(y_test, pred))
    print("MAE:", mean_absolute_error(y_test, pred))

    # ==========================================
    # 2. DEMANDA DE CARRERAS
    # ==========================================

    demanda = (
        df.groupby("programa")
        .size()
        .reset_index(name="Cantidad_Egresados")
    )

    demanda["Demanda_Predicha"] = demanda["Cantidad_Egresados"]

    demanda.to_csv("predicciones_demanda.csv", index=False)

    # ==========================================
    # 3. SALARIO ESTIMADO
    # ==========================================

    df["Salario"] = (
        df["promedio"] * 250 +
        df["edad"] * 30 +
        1200
    )

    X_sal = df[["promedio", "edad"]]
    y_sal = df["Salario"]

    modelo_sal = LinearRegression()

    modelo_sal.fit(X_sal, y_sal)

    salario_pred = modelo_sal.predict(X_sal)

    salario = pd.DataFrame({
        "Programa": df["programa"],
        "Promedio": df["promedio"],
        "Edad": df["edad"],
        "Salario_Predicho": salario_pred
    })

    salario.to_csv("predicciones_salario.csv", index=False)

    # ==========================================
    # 4. EMPLEABILIDAD
    # ==========================================

    df["Empleable"] = (
        (df["promedio"] >= 14)
    ).astype(int)

    X_emp = df[["promedio", "edad"]]
    y_emp = df["Empleable"]

    modelo_emp = RandomForestClassifier(random_state=42)

    modelo_emp.fit(X_emp, y_emp)

    prob = modelo_emp.predict_proba(X_emp)[:, 1]

    empleo = pd.DataFrame({
        "Programa": df["programa"],
        "Promedio": df["promedio"],
        "Edad": df["edad"],
        "Probabilidad_Empleo": prob * 100
    })

    empleo.to_csv("predicciones_empleabilidad.csv", index=False)

    print("Archivos generados correctamente.")


if __name__ == "__main__":
    ejecutar_ia()