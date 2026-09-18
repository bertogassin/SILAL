fn main() {
    println!("cargo:rerun-if-env-changed=SI_SPARK_ENGINE_LIB_DIR");
    if std::env::var_os("CARGO_FEATURE_ADA").is_none() {
        return;
    }
    let dir = std::env::var("SI_SPARK_ENGINE_LIB_DIR")
        .unwrap_or_else(|_| concat!(env!("CARGO_MANIFEST_DIR"), "/../../spark/lib").to_string());
    println!("cargo:rustc-link-search=native={dir}");
    println!("cargo:rustc-link-lib=static=si_spark_engine");
}
