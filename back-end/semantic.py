import pandas as pd
from database import engine


def generar_kpis():

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

    # unir

    df = fact.merge(
        uni,
        on="id_universidad"
    )

    df = df.merge(
        prog,
        on="id_programa"
    )

    # KPIs

    total_egresados = len(df)

    promedio_general = round(
        df["promedio"].mean(),
        2
    )

    promedio_edad = round(
        df["edad"].mean(),
        2
    )

    top_universidades = (

        df.groupby(
            "universidad"
        )
        .size()
        .sort_values(
            ascending=False
        )
        .head(10)
        .reset_index(
            name="egresados"
        )

    )

    top_programas = (

        df.groupby(
            "programa"
        )
        .size()
        .sort_values(
            ascending=False
        )
        .head(10)
        .reset_index(
            name="egresados"
        )

    )

    return {

        "total_egresados":
            total_egresados,

        "promedio_general":
            promedio_general,

        "promedio_edad":
            promedio_edad,

        "top_universidades":
            top_universidades.to_dict(
                orient="records"
            ),

        "top_programas":
            top_programas.to_dict(
                orient="records"
            )
    }