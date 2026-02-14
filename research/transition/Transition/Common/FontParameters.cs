using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI;
using Windows.UI.Text;
using Windows.UI.Xaml.Media;

namespace Easycoustics.Transition.Common
{
    public class FontParameters : BindableBase
    {
        private double fontSize;
        public double FontSize
        {
            get => fontSize;
            set { SetProperty(ref fontSize, value); }
        }

        private FontFamily fontFamily;
        public FontFamily FontFamily
        {
            get => fontFamily;
            set { SetProperty(ref fontFamily, value); }
        }

        private FontWeight fontWeight;
        public FontWeight FontWeight
        {
            get => fontWeight;
            set { SetProperty(ref fontWeight, value); }
        }

        private Color fontColor;
        public Color FontColor
        {
            get => fontColor;
            set { SetProperty(ref fontColor, value); }
        }

        private FontStyle fontStyle;
        public FontStyle FontStyle
        {
            get => fontStyle;
            set { SetProperty(ref fontStyle, value); }
        }

        private TextDecorations decoration;
        public TextDecorations Decoration
        {
            get => decoration;
            set { SetProperty(ref decoration, value); }
        }

        public FontParameters()
        {
            decoration = TextDecorations.None;
            fontColor = Colors.Black;
            fontFamily = new FontFamily("Arial");
            fontSize = 12;
            fontStyle = FontStyle.Normal;
            fontWeight = FontWeights.Normal;
            
        }
    }
}
