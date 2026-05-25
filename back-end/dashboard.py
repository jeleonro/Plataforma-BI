import pandas as pd
from database import engine


def dashboard_data():

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

    df = fact.merge(uni, on="id_universidad")
    df = df.merge(prog, on="id_programa")

    # por universidad
    por_uni = (
        df.groupby("universidad")
        .size()
        .sort_values(ascending=False)
        .head(10)
        .reset_index(name="cantidad")
    )

    # por programa
    por_prog = (
        df.groupby("programa")
        .size()
        .sort_values(ascending=False)
        .head(10)
        .reset_index(name="cantidad")
    )

    # por sexo — viene directo del fact (columna guardada en ETL)
    por_sexo = (
        fact.groupby("sexo")
        .size()
        .reset_index(name="cantidad")
    )

    return {
        "universidades": por_uni.to_dict(orient="records"),
        "programas":     por_prog.to_dict(orient="records"),
        "sexo":          por_sexo.to_dict(orient="records")
    }
