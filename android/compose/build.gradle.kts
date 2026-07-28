plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.plugin.compose")
    id("maven-publish")
}

android {
    namespace = "io.github.codeinscrubs.bidilens.compose"
    compileSdk = 36

    defaultConfig {
        minSdk = 23
        consumerProguardFiles("consumer-rules.pro")
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

    publishing {
        singleVariant("release") {
            withSourcesJar()
        }
    }
}

dependencies {
    api(project(":core"))
    api("androidx.compose.ui:ui:1.11.4")
    implementation("androidx.compose.foundation:foundation:1.11.4")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.11.4")
    debugImplementation("androidx.compose.ui:ui-test-manifest:1.11.4")
}

afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("release") {
                artifactId = "bidilens-android-compose"
                from(components["release"])
                pom {
                    name = "BidiLens Android Compose"
                    description = "Jetpack Compose text and text-field integration for mixed-direction content."
                    url = "https://github.com/CodeinScrubs/BidiLens"
                    inceptionYear = "2026"
                    licenses {
                        license {
                            name = "MIT License"
                            url = "https://opensource.org/license/mit"
                            distribution = "repo"
                        }
                    }
                    developers {
                        developer {
                            id = "CodeinScrubs"
                            name = "CodeinScrubs"
                            url = "https://github.com/CodeinScrubs"
                        }
                    }
                    scm {
                        url = "https://github.com/CodeinScrubs/BidiLens"
                        connection = "scm:git:https://github.com/CodeinScrubs/BidiLens.git"
                        developerConnection = "scm:git:ssh://git@github.com/CodeinScrubs/BidiLens.git"
                    }
                }
            }
        }
    }
}
