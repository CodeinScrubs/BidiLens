package io.github.codeinscrubs.bidilens.sample

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.codeinscrubs.bidilens.compose.BidiBasicTextField
import io.github.codeinscrubs.bidilens.compose.BidiText
import io.github.codeinscrubs.bidilens.core.BidiDirection
import io.github.codeinscrubs.bidilens.views.BidiTextBuilder

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFFFAF8F2),
                ) {
                    AndroidBidiDemo()
                }
            }
        }
    }
}

@Composable
private fun AndroidBidiDemo() {
    var title by remember { mutableStateOf("آپاندیسیت") }
    var source by remember { mutableStateOf("از جلد سه qb، page 97") }
    var notes by remember {
        mutableStateOf("راست به چپ\nقابلیت مرج کردن کارت‌ها بعد از یک مدت وجود داشته باشد.")
    }
    val nextReview = remember {
        BidiTextBuilder(BidiDirection.LTR)
            .appendLiteral("Next: ")
            .appendFragment("۷ مرداد ۱۴۰۵")
            .toString()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 28.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Text(
            text = "BidiLens Android",
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = "The interface stays LTR; each user-generated value resolves independently.",
            color = Color(0xFF55554F),
        )

        BidiOutlinedField(
            label = "Topic title",
            value = title,
            onValueChange = { title = it },
            tag = "topic-title",
        )
        BidiOutlinedField(
            label = "Notes / Explanation",
            value = notes,
            onValueChange = { notes = it },
            tag = "notes",
            minHeight = 116,
        )
        BidiOutlinedField(
            label = "Source",
            value = source,
            onValueChange = { source = it },
            tag = "source",
        )

        Text("Mixed labels", fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color(0xFFD7D3C7), RoundedCornerShape(18.dp))
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = nextReview,
                modifier = Modifier
                    .weight(1f)
                    .testTag("next-review"),
                style = TextStyle(fontSize = 18.sp),
            )
            Spacer(Modifier.width(12.dp))
            Text("📅", fontSize = 24.sp)
        }

        Text("Flagship content-majority case", fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
        BidiText(
            text = "React یک کتابخانه جاوااسکریپت بسیار محبوب است.",
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White, RoundedCornerShape(14.dp))
                .padding(16.dp)
                .testTag("flagship"),
            style = TextStyle(fontSize = 19.sp),
        )

        Text("Pure LTR no-op", fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
        BidiText(
            text = "This English sentence is passed through without BidiLens metadata.",
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White, RoundedCornerShape(14.dp))
                .padding(16.dp)
                .testTag("pure-ltr"),
            style = TextStyle(fontSize = 16.sp),
        )
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun BidiOutlinedField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    tag: String,
    minHeight: Int = 58,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, color = Color(0xFF4B4B46), fontWeight = FontWeight.Medium)
        BidiBasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(minHeight.dp)
                .border(2.dp, Color(0xFF4E855F), RoundedCornerShape(16.dp))
                .padding(horizontal = 16.dp, vertical = 14.dp)
                .testTag(tag),
            textStyle = TextStyle(fontSize = 19.sp, color = Color(0xFF20201E)),
        )
    }
}
