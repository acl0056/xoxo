using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI;
using Windows.UI.Text;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;

namespace Easycoustics.Transition.Common
{
    public class GraphParameters : BindableBase, ICloneable
    {
        private double borderThickness;
        public double BorderThickness { get => borderThickness; set { SetProperty(ref borderThickness, value); } }

        private Color borderColor;
        public Color BorderColor { get => borderColor; set { SetProperty(ref borderColor, value); } }

        private double majorDivStrokeThickness;
        public double MajorDivStrokeThickness { get => majorDivStrokeThickness; set { SetProperty(ref majorDivStrokeThickness, value); } }

        private double minorDivStrokeThickness;
        public double MinorDivStrokeThickness { get => minorDivStrokeThickness; set { SetProperty(ref minorDivStrokeThickness, value); } }
        
        private Color minorDivColor;
        public Color MinorDivColor { get => minorDivColor; set { minorDivColor = value; SetProperty(ref minorDivColor, value); } }

        private Color majorDivColor;
        public Color MajorDivColor { get => majorDivColor; set { majorDivColor = value; SetProperty(ref majorDivColor, value); } }

        private Color gridBackgroundColor;
        public Color GridBackgroundColor { get => gridBackgroundColor; set { gridBackgroundColor = value; SetProperty(ref gridBackgroundColor, value); } }

        private Color frameColor;
        public Color FrameColor { get => frameColor; set { frameColor = value; SetProperty(ref frameColor, value); } }



        private FontParameters verticalScaleFontParams;
        public FontParameters VerticalScaleFontParams
        {
            get => verticalScaleFontParams;
            set { verticalScaleFontParams = value;SetProperty(ref verticalScaleFontParams, value); }
        }

        private FontParameters horizontalScaleFontParams;
        public FontParameters HorizontalScaleFontParams
        {
            get => horizontalScaleFontParams;
            set { horizontalScaleFontParams = value; SetProperty(ref horizontalScaleFontParams, value); }
        }

        private FontParameters mapLegendFontParams;
        public FontParameters MapLegendFontParams
        {
            get => mapLegendFontParams;
            set { mapLegendFontParams = value; SetProperty(ref mapLegendFontParams, value); }
        }

        private FontParameters titleFontParams;
        public FontParameters TitleFontParams
        {
            get => titleFontParams;
            set { titleFontParams = value; SetProperty(ref titleFontParams, value); }
        }


        public GraphParameters()
        {
            minorDivStrokeThickness = 1;
            majorDivStrokeThickness = 1;

            majorDivColor = Color.FromArgb(255, 140, 140, 140);
            minorDivColor = Color.FromArgb(255, 235, 235, 235);

            gridBackgroundColor = Colors.White;
            frameColor = Color.FromArgb(255, 230, 230, 230);
            
            borderColor = Colors.Black;
            borderThickness = 1;

            verticalScaleFontParams = new FontParameters();
            horizontalScaleFontParams = new FontParameters();
            mapLegendFontParams = new FontParameters();
            titleFontParams = new FontParameters()
            {
                FontSize = 20,
                FontWeight = FontWeights.Bold
            };

        }

        public object Clone()
        {
            var output = new GraphParameters()
            {
                BorderColor = this.BorderColor,
                BorderThickness = this.BorderThickness,
                FrameColor = this.FrameColor,
                GridBackgroundColor = this.GridBackgroundColor,
                MajorDivColor = this.MajorDivColor,
                MajorDivStrokeThickness = this.MajorDivStrokeThickness,
                MinorDivColor = this.MinorDivColor,
                MinorDivStrokeThickness = this.MinorDivStrokeThickness,
                VerticalScaleFontParams = this.VerticalScaleFontParams,
                HorizontalScaleFontParams = this.HorizontalScaleFontParams,
                MapLegendFontParams = this.MapLegendFontParams,
                TitleFontParams = this.TitleFontParams
            };

            return output;

        }
    }
}
