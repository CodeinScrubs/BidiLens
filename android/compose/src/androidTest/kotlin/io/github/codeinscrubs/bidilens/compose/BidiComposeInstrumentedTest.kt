package io.github.codeinscrubs.bidilens.compose

import androidx.compose.foundation.layout.width
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.codeinscrubs.bidilens.core.BidiControls
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BidiComposeInstrumentedTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun flagshipExposesRtlSemanticsAndRendersAtRightEdge() {
        val source = "React یک کتابخانه جاوااسکریپت بسیار محبوب است."
        var layout: TextLayoutResult? = null
        compose.setContent {
            BidiText(
                text = source,
                modifier = Modifier.width(320.dp).testTag("flagship"),
                style = TextStyle(fontSize = 18.sp),
                onTextLayout = { layout = it },
            )
        }

        compose.onNodeWithTag("flagship")
            .assertTextEquals(source)
            .assert(SemanticsMatcher.expectValue(BidiLensDirectionKey, "rtl"))
        compose.waitUntil { layout != null }
        compose.runOnIdle {
            val result = requireNotNull(layout)
            assertTrue(result.getLineRight(0) > result.size.width * 0.9f)
        }
    }

    @Test
    fun pureLtrHasNoBidiLensSemantics() {
        compose.setContent {
            BidiText(
                text = "Plain English",
                modifier = Modifier.testTag("ltr"),
            )
        }

        compose.onNodeWithTag("ltr")
            .assert(SemanticsMatcher.keyNotDefined(BidiLensDirectionKey))
    }

    @Test
    fun editableFieldKeepsLogicalValueFreeOfControls() {
        var value = "آپاندیسیت"
        compose.setContent {
            BidiBasicTextField(
                value = value,
                onValueChange = { value = it },
                modifier = Modifier.width(320.dp).testTag("field"),
            )
        }

        compose.onNodeWithTag("field").performTextInput(" React")
        compose.waitForIdle()
        compose.runOnIdle {
            assertTrue(value.contains("آپاندیسیت"))
            assertTrue(value.contains("React"))
            assertTrue(value.none { it == BidiControls.LRI || it == BidiControls.RLI || it == BidiControls.PDI })
        }
    }
}
