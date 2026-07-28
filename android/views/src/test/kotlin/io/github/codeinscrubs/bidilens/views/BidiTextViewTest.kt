package io.github.codeinscrubs.bidilens.views

import android.app.Application
import android.view.Gravity
import android.view.View
import android.widget.EditText
import android.widget.TextView
import io.github.codeinscrubs.bidilens.core.BidiControls
import io.github.codeinscrubs.bidilens.core.BidiDirection
import io.github.codeinscrubs.bidilens.core.stripBidiControls
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class BidiTextViewTest {
    private val context: Application get() = RuntimeEnvironment.getApplication()

    @Test
    fun pureLtrLeavesEveryAuthoredViewPropertyUntouched() {
        val view = TextView(context).apply {
            text = "Plain English"
            textDirection = View.TEXT_DIRECTION_FIRST_STRONG
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            gravity = Gravity.CENTER
        }
        val originalDirection = view.textDirection
        val originalAlignment = view.textAlignment
        val originalGravity = view.gravity

        val analysis = view.applyBidiLens()

        assertFalse(analysis.interventionRequired)
        assertEquals(originalDirection, view.textDirection)
        assertEquals(originalAlignment, view.textAlignment)
        assertEquals(originalGravity, view.gravity)
        assertNull(view.getTag(R.id.bidilens_original_view_state))
    }

    @Test
    fun persianTextGetsRtlParagraphAndPhysicalRightAlignment() {
        val view = TextView(context).apply { text = "آپاندیسیت" }

        val analysis = view.applyBidiLens()

        assertEquals(BidiDirection.RTL, analysis.direction)
        assertTrue(analysis.interventionRequired)
        assertTrue(view.getTag(R.id.bidilens_original_view_state) != null)
        assertEquals("آپاندیسیت", view.text.toString())
    }

    @Test
    fun mixedPersianSourceKeepsLogicalString() {
        val source = "از جلد سه qb، page 97"
        val view = TextView(context).apply { text = source }

        view.applyBidiLens()

        assertEquals(source, view.text.toString())
        assertTrue(view.getTag(R.id.bidilens_original_view_state) != null)
    }

    @Test
    fun returningToPureLtrRestoresAuthoredState() {
        val view = TextView(context).apply {
            textDirection = View.TEXT_DIRECTION_LOCALE
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            gravity = Gravity.CENTER_VERTICAL or Gravity.CENTER_HORIZONTAL
            text = "سلام"
        }
        val originalDirection = view.textDirection
        val originalAlignment = view.textAlignment
        val originalGravity = view.gravity
        view.applyBidiLens()
        view.text = "English only"

        view.applyBidiLens()

        assertEquals(originalDirection, view.textDirection)
        assertEquals(originalAlignment, view.textAlignment)
        assertEquals(originalGravity, view.gravity)
        assertNull(view.getTag(R.id.bidilens_original_view_state))
    }

    @Test
    fun editControllerNeverReplacesEditableOrSelection() {
        val editText = EditText(context)
        editText.setText("سلام")
        editText.setSelection(editText.length())
        val editable = editText.editableText
        val controller = BidiEditTextController.attach(editText)

        editable.append(" React")

        assertSame(editable, editText.editableText)
        assertEquals(editText.length(), editText.selectionStart)
        assertEquals("سلام React", editText.text.toString())
        assertTrue(editText.getTag(R.id.bidilens_original_view_state) != null)
        controller.detach()
    }

    @Test
    fun detachedControllerRestoresStateAndStopsReacting() {
        val editText = EditText(context).apply {
            textDirection = View.TEXT_DIRECTION_FIRST_STRONG
            setText("سلام")
        }
        val originalDirection = editText.textDirection
        val controller = BidiEditTextController.attach(editText)
        assertTrue(editText.getTag(R.id.bidilens_original_view_state) != null)

        controller.detach()
        editText.setText("فارسی")

        assertEquals(originalDirection, editText.textDirection)
    }

    @Test
    fun displayHelperUsesTransientIsolationOnly() {
        val source = "React یک کتابخانه است."
        val view = TextView(context)

        view.setBidiDisplayText(source)

        assertTrue(view.text.contains(BidiControls.LRI))
        assertEquals(source, stripBidiControls(view.text.toString()))
    }

    @Test
    fun mixedLabelBuilderIsolatesDateFromEnglishLabel() {
        val value = BidiTextBuilder(BidiDirection.LTR)
            .appendLiteral("Next: ")
            .appendFragment("۷ مرداد ۱۴۰۵")
            .toString()

        assertTrue(value.contains(BidiControls.RLI))
        assertTrue(value.endsWith(BidiControls.PDI))
        assertEquals("Next: ۷ مرداد ۱۴۰۵", stripBidiControls(value))
    }

    @Test
    fun sameDirectionBuilderFragmentIsNotWrapped() {
        val value = BidiTextBuilder(BidiDirection.LTR)
            .appendLiteral("Version ")
            .appendFragment("one")
            .toString()

        assertEquals("Version one", value)
    }
}
