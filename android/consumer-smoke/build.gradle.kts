plugins {
    id("com.android.library") version "9.3.1"
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.10"
}

android {
    namespace = "io.github.codeinscrubs.bidilens.consumer"
    compileSdk = 36

    defaultConfig {
        minSdk = 23
    }

    buildFeatures {
        compose = true
        buildConfig = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("io.github.codeinscrubs.bidilens:bidilens-core:0.1.1")
    implementation("io.github.codeinscrubs.bidilens:bidilens-android-views:0.1.1")
    implementation("io.github.codeinscrubs.bidilens:bidilens-android-compose:0.1.1")
}
