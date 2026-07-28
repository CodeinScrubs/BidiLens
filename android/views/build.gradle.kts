import com.vanniktech.maven.publish.AndroidSingleVariantLibrary
import com.vanniktech.maven.publish.JavadocJar
import com.vanniktech.maven.publish.SourcesJar

plugins {
    id("com.android.library")
    id("com.vanniktech.maven.publish")
}

android {
    namespace = "io.github.codeinscrubs.bidilens.views"
    compileSdk = 36

    defaultConfig {
        minSdk = 21
        consumerProguardFiles("consumer-rules.pro")
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        buildConfig = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isIncludeAndroidResources = true
    }
}

dependencies {
    api(project(":core"))

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.16.1")
    androidTestImplementation("androidx.test:core:1.7.0")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
}

mavenPublishing {
    configure(
        AndroidSingleVariantLibrary(
            javadocJar = JavadocJar.Empty(),
            sourcesJar = SourcesJar.Sources(),
            variant = "release",
        ),
    )
    publishToMavenCentral()
    if (providers.gradleProperty("signingInMemoryKey").isPresent) {
        signAllPublications()
    }
    coordinates(project.group.toString(), "bidilens-android-views", project.version.toString())
    pom {
        name = "BidiLens Android Views"
        description = "Non-destructive TextView and EditText integration for mixed-direction text."
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
        issueManagement {
            system = "GitHub"
            url = "https://github.com/CodeinScrubs/BidiLens/issues"
        }
        ciManagement {
            system = "GitHub Actions"
            url = "https://github.com/CodeinScrubs/BidiLens/actions"
        }
    }
}
