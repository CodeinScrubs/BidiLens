package io.github.codeinscrubs.bidilens.views

import android.app.Activity
import android.os.Bundle
import android.text.Layout
import android.view.Gravity
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.codeinscrubs.bidilens.core.BidiDirection
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class BidiViewsInstrumentedTest {
    @Test
    fun testHostEnablesRtlWithoutLibraryManifestMutation() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals(true, context.supportsBidiLensRtl())
    }

    @Test
    fun realTextViewUsesRtlBaseWithoutChangingText() {
        val source = "React یک کتابخانه جاوااسکریپت بسیار محبوب است."
        val viewRef = AtomicReference<TextView>()
        ActivityScenario.launch(BidiViewsTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val view = TextView(activity).apply {
                    text = source
                    activity.content.addView(
                        this,
                        FrameLayout.LayoutParams(
                            FrameLayout.LayoutParams.MATCH_PARENT,
                            FrameLayout.LayoutParams.WRAP_CONTENT,
                        ),
                    )
                }
                val analysis = view.applyBidiLens()
                assertEquals(BidiDirection.RTL, analysis.resolvedDirection)
                viewRef.set(view)
            }

            InstrumentationRegistry.getInstrumentation().waitForIdleSync()
            scenario.onActivity {
                val view = viewRef.get()
                assertEquals(source, view.text.toString())
                assertEquals(Layout.DIR_RIGHT_TO_LEFT, view.layout.getParagraphDirection(0))
                assertEquals(Gravity.RIGHT, view.gravity and Gravity.HORIZONTAL_GRAVITY_MASK)
            }
        }
    }

    @Test
    fun realTextViewKeepsRtlParagraphWhenPhysicallyAlignedLeft() {
        val source = "React یک کتابخانه بسیار محبوب است."
        val viewRef = AtomicReference<TextView>()
        ActivityScenario.launch(BidiViewsTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val view = TextView(activity).apply {
                    text = source
                    textAlignment = TextView.TEXT_ALIGNMENT_GRAVITY
                    gravity = Gravity.LEFT
                    activity.content.addView(
                        this,
                        FrameLayout.LayoutParams(
                            FrameLayout.LayoutParams.MATCH_PARENT,
                            FrameLayout.LayoutParams.WRAP_CONTENT,
                        ),
                    )
                }
                view.applyBidiLens(alignToContent = true)
                view.applyBidiLens(alignToContent = false)
                viewRef.set(view)
            }

            InstrumentationRegistry.getInstrumentation().waitForIdleSync()
            scenario.onActivity {
                val view = viewRef.get()
                assertEquals(source, view.text.toString())
                assertEquals(Layout.DIR_RIGHT_TO_LEFT, view.layout.getParagraphDirection(0))
                assertEquals(Gravity.LEFT, view.gravity and Gravity.HORIZONTAL_GRAVITY_MASK)
            }
        }
    }

    @Test
    fun realEditTextKeepsEditableAndCursorStable() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.runOnMainSync {
            val editText = EditText(instrumentation.targetContext)
            editText.setText("آپاندیسیت")
            editText.setSelection(editText.length())
            val editable = editText.editableText
            val controller = BidiEditTextController.attach(editText)

            editable.append(" React")

            assertSame(editable, editText.editableText)
            assertEquals(editText.length(), editText.selectionStart)
            assertEquals("آپاندیسیت React", editText.text.toString())
            controller.detach()
        }
    }
}

class BidiViewsTestActivity : Activity() {
    lateinit var content: FrameLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        content = FrameLayout(this)
        setContentView(content)
    }
}
