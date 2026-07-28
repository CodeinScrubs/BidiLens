using System.Windows;
using BidiLens;
using BidiLens.Wpf;

namespace BidiLens.Wpf.Sample;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        BidiWpf.Apply(MixedText, alignment: BidiAlignment.PhysicalLeft);
        BidiWpf.Apply(PlainText);
    }
}
