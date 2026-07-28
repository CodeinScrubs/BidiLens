plugins {
    id("com.android.application") version "9.2.1" apply false
    id("com.android.library") version "9.2.1" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.3.10" apply false
    id("maven-publish")
}

allprojects {
    group = "io.github.codeinscrubs.bidilens"
    version = "0.1.0"
}
