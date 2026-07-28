package io.github.codeinscrubs.bidilens.consumer

import android.widget.TextView
import androidx.compose.runtime.Composable
import io.github.codeinscrubs.bidilens.compose.BidiText
import io.github.codeinscrubs.bidilens.core.BidiAnalysis
import io.github.codeinscrubs.bidilens.core.analyzeBidi
import io.github.codeinscrubs.bidilens.views.applyBidiLens

fun analyzeFromPublishedCore(text: String): BidiAnalysis = analyzeBidi(text)

fun TextView.applyPublishedViewsAdapter(): BidiAnalysis = applyBidiLens()

@Composable
fun PublishedComposeAdapter(text: String) {
    BidiText(text)
}
