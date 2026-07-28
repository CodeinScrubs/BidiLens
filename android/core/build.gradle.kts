import com.vanniktech.maven.publish.AndroidSingleVariantLibrary
import com.vanniktech.maven.publish.JavadocJar
import com.vanniktech.maven.publish.SourcesJar

plugins {
    id("com.android.library")
    id("com.vanniktech.maven.publish")
}

android {
    namespace = "io.github.codeinscrubs.bidilens.core"
    compileSdk = 36

    defaultConfig {
        minSdk = 21
        consumerProguardFiles("consumer-rules.pro")
    }

    buildFeatures {
        buildConfig = false
    }

    androidResources.enable = false

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.all {
            it.useJUnit()
        }
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
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
    coordinates(project.group.toString(), "bidilens-core", project.version.toString())
    pom {
        name = "BidiLens Android Core"
        description = "Dependency-light mixed-direction text analysis for Android."
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
