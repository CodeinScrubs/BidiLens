plugins {
    id("com.android.application") version "9.3.1" apply false
    id("com.android.library") version "9.2.1" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.3.10" apply false
    id("com.vanniktech.maven.publish") version "0.37.0" apply false
}

allprojects {
    group = "io.github.codeinscrubs.bidilens"
    version = "0.1.1"
}
