plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "io.github.codeinscrubs.bidilens.sample"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.codeinscrubs.bidilens.sample"
        minSdk = 23
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
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
    implementation(project(":core"))
    implementation(project(":views"))
    implementation(project(":compose"))
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.ui:ui:1.11.4")
    implementation("androidx.compose.foundation:foundation:1.11.4")
    implementation("androidx.compose.material3:material3:1.4.0")
    implementation("androidx.compose.ui:ui-tooling-preview:1.11.4")

    debugImplementation("androidx.compose.ui:ui-tooling:1.11.4")
    debugImplementation("androidx.compose.ui:ui-test-manifest:1.11.4")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.11.4")
}
