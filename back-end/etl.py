import pandas as pd
from database import engine
from sqlalchemy import inspect


def ejecutar_etl():

    # =========================
    # 1 EXTRACT
    # =========================

    inspector = inspect(engine)

    if not inspector.has_table(
        "staging_egresados"
    ):

        raise Exception(
            "La tabla staging_egresados no existe. "
            "Primero cargue un CSV."
        )

    query = """
    SELECT *
    FROM staging_egresados
    """

    df = pd.read_sql(
        query,
        engine
    )

    # =====================
    # LIMPIEZA DE TIPOS
    # =====================

    df["EDAD"] = pd.to_numeric(
        df["EDAD"],
        errors="coerce"
    )

    df["ANIO"] = pd.to_numeric(
        df["ANIO"],
        errors="coerce"
    )

    df["CREDITOS_APROBADOS"] = pd.to_numeric(
        df["CREDITOS_APROBADOS"],
        errors="coerce"
    )

    df["NOTA_PROMEDIO"] = pd.to_numeric(
        df["NOTA_PROMEDIO"],
        errors="coerce"
    )

    # =========================
    # 2 TRANSFORM
    # =========================

    renombres = {

        "NOMBRE_ENTIDAD":"universidad",
        "TIPO_GESTION":"tipo_gestion",
        "LICENCIADO":"licenciado",
        "SEXO":"sexo",
        "EDAD":"edad",
        "NOTA_PROMEDIO":"promedio",
        "NOMBRE_PROGRAMA":"programa",
        "FECHA_EGRESO":"fecha_egreso"

    }

    df.rename(
        columns=renombres,
        inplace=True
    )

    # eliminar columnas vacías

    df.dropna(
        axis=1,
        how="all",
        inplace=True
    )

    # normalizar textos

    columnas_texto = [

        "universidad",
        "programa",
        "sexo"

    ]

    for c in columnas_texto:

        if c in df.columns:

            df[c] = (

                df[c]
                .astype(str)
                .str.upper()
                .str.strip()

            )

    # fecha

    df["fecha_egreso"] = pd.to_datetime(
        df["fecha_egreso"],
        errors="coerce"
    )

    # promedio válido

    df = df[
        df["promedio"].notna()
    ]

    df = df[
        (df["promedio"] >= 0)
        &
        (df["promedio"] <= 20)
    ]

    # =========================
    # 3 DIMENSIONES
    # =========================

    # UNIVERSIDAD

    dim_universidad = (

        df[
            [
                "universidad",
                "tipo_gestion",
                "licenciado"
            ]
        ]
        .drop_duplicates()
        .reset_index(drop=True)

    )

    dim_universidad[
        "id_universidad"
    ] = (

        dim_universidad.index + 1

    )

    # PROGRAMA

    dim_programa = (

        df[
            [
                "programa"
            ]
        ]
        .drop_duplicates()
        .reset_index(drop=True)

    )

    dim_programa[
        "id_programa"
    ] = (

        dim_programa.index + 1

    )

    # TIEMPO

    dim_tiempo = (

        df[
            [
                "fecha_egreso"
            ]
        ]
        .drop_duplicates()
        .reset_index(drop=True)

    )

    dim_tiempo["anio"] = (
        dim_tiempo[
            "fecha_egreso"
        ].dt.year
    )

    dim_tiempo["mes"] = (
        dim_tiempo[
            "fecha_egreso"
        ].dt.month
    )

    dim_tiempo[
        "id_tiempo"
    ] = (

        dim_tiempo.index + 1

    )

    # =========================
    # 4 FACT TABLE
    # =========================

    # merge universidad

    fact = df.merge(

        dim_universidad,
        on=[
            "universidad",
            "tipo_gestion",
            "licenciado"
        ],
        how="left"

    )

    # merge programa

    fact = fact.merge(

        dim_programa,
        on="programa",
        how="left"

    )

    # merge tiempo

    fact = fact.merge(

        dim_tiempo,
        on="fecha_egreso",
        how="left"

    )

    # seleccionar medidas + FK

    fact_egresados = fact[

        [

            "id_universidad",
            "id_programa",
            "id_tiempo",

            "promedio",
            "edad",
            "sexo"

        ]

    ].copy()

    # PK fact

    fact_egresados[
        "id_fact"
    ] = (

        fact_egresados.index + 1

    )

    # =========================
    # 5 LOAD
    # =========================

    dim_universidad.to_sql(

        "dim_universidad",
        con=engine,
        if_exists="replace",
        index=False

    )

    dim_programa.to_sql(

        "dim_programa",
        con=engine,
        if_exists="replace",
        index=False

    )

    dim_tiempo.to_sql(

        "dim_tiempo",
        con=engine,
        if_exists="replace",
        index=False

    )

    fact_egresados.to_sql(

        "fact_egresados",
        con=engine,
        if_exists="replace",
        index=False

    )

    return {

        "universidades":
            len(dim_universidad),

        "programas":
            len(dim_programa),

        "tiempos":
            len(dim_tiempo),

        "facts":
            len(fact_egresados)

    }