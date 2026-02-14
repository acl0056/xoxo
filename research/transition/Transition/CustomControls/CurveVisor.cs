using Easycoustics.Transition.Common;
using Easycoustics.Transition.Design;
using Easycoustics.Transition.Functions;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Foundation;
using Windows.UI;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Shapes;

namespace Easycoustics.Transition.CustomControls
{
    public class CurveVisor : Canvas
    {
        public ObservableCollection<Function> Curves = new ObservableCollection<Function>();

        private Dictionary<Function, Polyline> dictPolylinesMag = new Dictionary<Function, Polyline>();
        private Dictionary<Function, Polyline> dictPolylinesPhase = new Dictionary<Function, Polyline>();

        private ScaleParameters scaleParams = new ScaleParameters();
        public ScaleParameters ScaleParams { get => scaleParams; set {
              //  ScaleParams.PropertyChanged -= GraphPropertyChanged;
                scaleParams = value;
              //  scaleParams.PropertyChanged += GraphPropertyChanged;
                ReDraw();
            } } 

        private List<Line> VerticalMajorDivs = new List<Line>();
        private List<Line> VerticalMinorDivs = new List<Line>();

        private List<Line> HorizontalMajorDivs = new List<Line>();
        private List<Line> HorizontalMinorDivs = new List<Line>();

        private List<Tuple<TextBlock, double, bool>> VerticalLeftLabels  = new List<Tuple<TextBlock, double, bool>>();
        private List<Tuple<TextBlock, double, bool>> VerticalRightLabels = new List<Tuple<TextBlock, double, bool>>();
        private List<Tuple<TextBlock, double, bool>> HorizontalLabels    = new List<Tuple<TextBlock, double, bool>>();

        private double CanvasWidth => 1800;
        private double CanvasHeight => 1000;

        private double CurvesCanvasMarginTop = 50;
        private double CurvesCanvasMarginLeft = 50;
        private double CurvesCanvasMarginRight = 50;
        private double CurvesCanvasMarginBottom = 100;

        private Viewbox ViewBoxCurves = new Viewbox();
        private Border BorderCurves = new Border();
        private SolidColorBrush MajorDivBrush;
        private SolidColorBrush MinorDivBrush;

        private NonClippingCanvas CurvesCanvas = new NonClippingCanvas();

        private double currentLogSmallestStepHorizontal;
        private double currentLogSmallestStepVertical;

        private GraphParameters GraphParams { get => UserDesign.CurrentDesign.CurveGraphParameters; }

        public string verticalQuantity;
        public string horizontalQuantity;

        public CurveVisor() : base()
        {
            this.HorizontalAlignment = HorizontalAlignment.Stretch;
            this.VerticalAlignment = VerticalAlignment.Stretch;

            CurvesCanvas.Width = CanvasWidth;
            CurvesCanvas.Height = CanvasHeight;

            Curves.CollectionChanged += CurveCollectionChanged;
            //ScaleParams.PropertyChanged += GraphPropertyChanged;

            this.SizeChanged += cnvSizeChanged;
            BorderCurves.SizeChanged += curvesCanvasSizeChanged;

            ViewBoxCurves.Child = CurvesCanvas;
            ViewBoxCurves.Stretch = Stretch.Fill;

            BorderCurves.Child = ViewBoxCurves;

            Children.Add(BorderCurves);
          

            ReDraw();

        }

        private void curvesCanvasSizeChanged(object sender, SizeChangedEventArgs e)
        {
            //ClearLabels();
            // ReDrawLabels();
            RePositionLabels();
        }

        private void CurveCollectionChanged(object sender, NotifyCollectionChangedEventArgs e)
        {
            
            switch (e.Action)
            {
                case NotifyCollectionChangedAction.Add:
                    foreach (var addfunc in e.NewItems)
                         AddCurve((Function)addfunc);
                    
                    break;

                case NotifyCollectionChangedAction.Remove:
                    foreach (var addfunc in e.OldItems)
                        RemoveCurve((Function)addfunc);
                    
                    break;

                case NotifyCollectionChangedAction.Replace:

                    break;

                case NotifyCollectionChangedAction.Reset:

                    break;

            }
        }



        private void GraphPropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            ReDraw();
        }

        private void cnvSizeChanged(object sender, SizeChangedEventArgs e)
        {
            BorderCurves.Width = ((ActualWidth - CurvesCanvasMarginLeft - CurvesCanvasMarginRight) >= 0) ?
                                    (ActualWidth - CurvesCanvasMarginLeft - CurvesCanvasMarginRight) : 0;
            Canvas.SetLeft(BorderCurves, CurvesCanvasMarginLeft);

            BorderCurves.Height = ((ActualHeight - CurvesCanvasMarginTop - CurvesCanvasMarginBottom) >= 0) ?
                                    (ActualHeight - CurvesCanvasMarginTop - CurvesCanvasMarginBottom) : 0;
            Canvas.SetTop(BorderCurves, CurvesCanvasMarginTop);
            
        }

        private void ReDraw()
        {
            ClearAll();
            this.Background = new SolidColorBrush(GraphParams.FrameColor);
            CurvesCanvas.Background = new SolidColorBrush(GraphParams.GridBackgroundColor);

            BorderCurves.BorderThickness = new Thickness(GraphParams.BorderThickness);
            BorderCurves.BorderBrush = new SolidColorBrush(GraphParams.BorderColor);

            MajorDivBrush = new SolidColorBrush(GraphParams.MajorDivColor);
            MinorDivBrush = new SolidColorBrush(GraphParams.MinorDivColor);

            if (scaleParams.HorizontalScale == AxisScale.Logarithmic) DrawVerticalLogDivs();
            if (scaleParams.HorizontalScale == AxisScale.Linear) DrawVerticalLinDivs();
          
            if (scaleParams.VerticalScale == AxisScale.Logarithmic) DrawHorizontalLogDivs();
            if (scaleParams.VerticalScale == AxisScale.Linear) DrawHorizontalLinDivs();
            if (scaleParams.VerticalScale == AxisScale.dB) DrawHorizontaldBDivs();
            
            ReDrawLabels();

            foreach (var curve in Curves)
                functionChanged(curve, null);
        }

        private void ReDrawLabels()
        {

            if (scaleParams.VerticalScale == AxisScale.dB) DrawVerticalLeftdBLabels();
            if (scaleParams.VerticalScale == AxisScale.Linear) DrawVerticalLeftLinLabels();
            if (scaleParams.VerticalScale == AxisScale.Logarithmic) DrawVerticalLeftLogLabels();

            if (scaleParams.HorizontalScale == AxisScale.Logarithmic) DrawHorizontalLogLabels();
            if (scaleParams.HorizontalScale == AxisScale.Linear) DrawHorizontalLinLabels();

            DrawVerticalRightLabels();

            RePositionLabels();
        }

        private void RePositionLabels()
        {
            RePositionLabelsHorizontal();
            RePositionLabelsVerticalLeft();
            RePositionLabelsVerticalRight();
        }

        private void RePositionLabelsHorizontal()
        {
            foreach (var tup in HorizontalLabels)
            {
                Canvas.SetLeft(tup.Item1, (CurvesCanvasMarginLeft / 2) + (tup.Item2 * BorderCurves.ActualWidth));
                Canvas.SetTop(tup.Item1, CurvesCanvasMarginTop + BorderCurves.ActualHeight + GraphParams.HorizontalScaleFontParams.FontSize);

                if (ScaleParams.HorizontalScale == AxisScale.Logarithmic)
                {
                    if ((currentLogSmallestStepHorizontal * BorderCurves.ActualWidth) < (GraphParams.HorizontalScaleFontParams.FontSize * 3))
                    { tup.Item1.Visibility = (tup.Item3) ? Visibility.Visible : Visibility.Collapsed; }
                    else
                    { tup.Item1.Visibility = Visibility.Visible; }
                }
                else
                    tup.Item1.Visibility = Visibility.Visible;
                
            }
        }

        private void RePositionLabelsVerticalLeft()
        {
            foreach (var tup in VerticalLeftLabels)
            {
                Canvas.SetLeft(tup.Item1, 0);
                Canvas.SetTop(tup.Item1, CurvesCanvasMarginTop + (tup.Item2 * BorderCurves.ActualHeight) - (GraphParams.VerticalScaleFontParams.FontSize / 2));

                if (ScaleParams.VerticalScale == AxisScale.Logarithmic)
                    if ((currentLogSmallestStepVertical * BorderCurves.ActualHeight) < (GraphParams.VerticalScaleFontParams.FontSize))
                        tup.Item1.Visibility = (tup.Item3) ? Visibility.Visible : Visibility.Collapsed; 
                    else
                        tup.Item1.Visibility = Visibility.Visible;
                else
                    tup.Item1.Visibility = Visibility.Visible;
            }
        }

        private void RePositionLabelsVerticalRight()
        {
            foreach (var tup in VerticalRightLabels)
            {
                Canvas.SetLeft(tup.Item1, CurvesCanvasMarginLeft + BorderCurves.ActualWidth + 5);
                Canvas.SetTop(tup.Item1, CurvesCanvasMarginTop + (tup.Item2 * BorderCurves.ActualHeight) - (GraphParams.VerticalScaleFontParams.FontSize / 2));

                if (ScaleParams.VerticalScale == AxisScale.Logarithmic)
                    if ((currentLogSmallestStepVertical * BorderCurves.ActualHeight) < (GraphParams.VerticalScaleFontParams.FontSize))
                        tup.Item1.Visibility = (tup.Item3) ? Visibility.Visible : Visibility.Collapsed;
                    else
                        tup.Item1.Visibility = Visibility.Visible;
                else
                    tup.Item1.Visibility = Visibility.Visible;
            }
        }


        private void DrawVerticalRightLabels()
        {
            if (ScaleParams.ComplexProjection != ComplexProjectedData.MagnitudePhase)
                return;

            int quantityOfLabels = ScaleParams.QuantityOfMajorDivsVertical + 1;
            double LabelStep = 1d / ScaleParams.QuantityOfMajorDivsVertical;

            decimal maximum;
            decimal minimum;
            if (ScaleParams.PhasePolarity == Polarity.Bipolar)
            {
                maximum = ScaleParams.MaximumPhase;
                minimum = maximum * -1;
            }
            else
            if (ScaleParams.PhasePolarity == Polarity.Positive)
            {
                maximum = ScaleParams.MaximumPhase;
                minimum = 0;
            }
            else
            {
                /* negative */
                maximum = 0;
                minimum = ScaleParams.MinimumPhase; /* this number must be negative */
            }

            var fontParams = GraphParams.VerticalScaleFontParams;
            decimal phaseStep = (maximum - minimum) / ScaleParams.QuantityOfMajorDivsVertical;

            TextBlock txt2;
            for (int x = 0; x < quantityOfLabels; x++)
            {
                txt2 = new TextBlock()
                {
                    Text = ConvertDecimalString(maximum - (x * phaseStep), CultureInfo.CurrentCulture.TwoLetterISOLanguageName),
                    FontFamily = fontParams.FontFamily,
                    FontSize = fontParams.FontSize,
                    FontStyle = fontParams.FontStyle,
                    TextDecorations = fontParams.Decoration,
                    FontWeight = fontParams.FontWeight,
                    Foreground = new SolidColorBrush(fontParams.FontColor),
                    Width = CurvesCanvasMarginLeft - 5,
                    HorizontalTextAlignment = TextAlignment.Left,
                };

                Children.Add(txt2);
                VerticalRightLabels.Add(new Tuple<TextBlock, double, bool>(txt2, x * LabelStep, true));
            }

        }

        private void DrawHorizontalLinLabels()
        {
            int quantityOfLabels = ScaleParams.QuantityOfMajorDivsHorizontal + 1;
            double LabelStep = 1d / ScaleParams.QuantityOfMajorDivsHorizontal;

            decimal maximum = ScaleParams.MaximumHorizontal;
            decimal minimum = ScaleParams.MinimumHorizontal;

            var fontParams = GraphParams.HorizontalScaleFontParams;
            decimal freqStep = (maximum - minimum) / ScaleParams.QuantityOfMajorDivsHorizontal;

        
            TextBlock txt;
            for (int x = 0; x < quantityOfLabels; x++)
            {
                txt = new TextBlock()
                {
                    Text = ConvertDecimalString(minimum + (x * freqStep), CultureInfo.CurrentCulture.TwoLetterISOLanguageName),
                    FontFamily = fontParams.FontFamily,
                    FontSize = fontParams.FontSize,
                    FontStyle = fontParams.FontStyle,
                    TextDecorations = fontParams.Decoration,
                    FontWeight = fontParams.FontWeight,
                    Foreground = new SolidColorBrush(fontParams.FontColor),
                    Width = CurvesCanvasMarginLeft - 5,
                    HorizontalTextAlignment = TextAlignment.Center,
                };

                Children.Add(txt);
                HorizontalLabels.Add(new Tuple<TextBlock, double, bool>(txt, LabelStep * x, true));
       
            }
        }

        private void DrawHorizontalLogLabels()
        {
            TextBlock txt;

            decimal minimum = scaleParams.MinimumHorizontal;
            int minExponent = (int)Math.Floor(Math.Log10(Math.Abs(Convert.ToDouble(minimum))));
            decimal minOneDigit = minimum / DecimalMath.PowerN(10, minExponent);
            int minOneDigitClean = (int)Math.Floor(minOneDigit);
            decimal minimumClean = minOneDigitClean * DecimalMath.PowerN(10, minExponent);


            decimal maximum = scaleParams.MaximumHorizontal;
            int maxExponent = (int)Math.Floor(Math.Log10(Math.Abs(Convert.ToDouble(maximum))));
            decimal maxOneDigit = maximum / DecimalMath.PowerN(10, maxExponent);
            int maxOneDigitClean = (int)Math.Floor(maxOneDigit);
            decimal maximumClean = maxOneDigitClean * DecimalMath.PowerN(10, maxExponent);

            double expSpace = Math.Log10(Convert.ToDouble(maximumClean) / Convert.ToDouble(minimumClean));
            var fontParams = GraphParams.HorizontalScaleFontParams;

            decimal currentOneDigit = minOneDigitClean;
            int currentExp = minExponent;

            double magPosition;
            double canvasPosition;

            double cnvWidth = BorderCurves.ActualWidth;
            double cnvHeight = BorderCurves.ActualHeight;

            int topOneDigit = minOneDigitClean;

            if ((minOneDigitClean == maxOneDigitClean) && (minExponent == maxExponent))
            {
                maxOneDigitClean++;
                if (maxOneDigitClean == 10) { maxOneDigitClean = 1; maxExponent++; }
            }

            int FinalOneDigit = maxOneDigitClean;
            int FinalExponent = maxExponent;

            FinalOneDigit++;
            if (FinalOneDigit == 10) { FinalOneDigit = 1; FinalExponent++; }

            while ((currentOneDigit != FinalOneDigit) || (currentExp != FinalExponent))
            {
                if (currentOneDigit > topOneDigit) topOneDigit = (int)currentOneDigit;
                currentOneDigit++;

                if (currentOneDigit == 10)
                {
                    currentOneDigit = 1;
                    currentExp++;
                }
            }
            
            currentOneDigit = minOneDigitClean;
            currentExp = minExponent;

            double x1 = Convert.ToDouble(topOneDigit) * Math.Pow(10, currentExp);
            double x2 = Convert.ToDouble(topOneDigit + 1) * Math.Pow(10, currentExp);
            double pos1 = Math.Log10(x1 / Convert.ToDouble(minimumClean)) / expSpace;
            double pos2 = Math.Log10(x2 / Convert.ToDouble(minimumClean)) / expSpace;
         
            currentLogSmallestStepHorizontal = (pos2 - pos1);

            while ((currentOneDigit != FinalOneDigit) || (currentExp != FinalExponent))
            {
                magPosition = Convert.ToDouble(currentOneDigit) * Math.Pow(10, currentExp);
                canvasPosition = Math.Log10(magPosition / Convert.ToDouble(minimumClean)) / expSpace;

                txt = new TextBlock()
                {
                    Text = ConvertDecimalString(Convert.ToDecimal(magPosition), ""),
                    FontFamily = fontParams.FontFamily,
                    FontSize = fontParams.FontSize,
                    FontStyle = fontParams.FontStyle,
                    TextDecorations = fontParams.Decoration,
                    FontWeight = fontParams.FontWeight,
                    Foreground = new SolidColorBrush(fontParams.FontColor),
                    Width = CurvesCanvasMarginLeft,
                    TextAlignment = TextAlignment.Center
                };
                
                Children.Add(txt);
                HorizontalLabels.Add(new Tuple<TextBlock, double, bool>(txt, canvasPosition, currentOneDigit == 1 || currentOneDigit == 2 || currentOneDigit == 5));
            
                currentOneDigit++;

                if (currentOneDigit == 10)
                {
                    currentOneDigit = 1;
                    currentExp++;
                }
            }
        }


        private void DrawVerticalLeftdBLabels()
        {
            int quantityOfLabels = ScaleParams.QuantityOfdBDivs + 1;
            double LabelStep = 1d / ScaleParams.QuantityOfdBDivs;
            decimal dbPerDiv = ScaleParams.DBPerDiv;
            decimal maximumdB = ScaleParams.MaximumdB;

            var fontParams = GraphParams.VerticalScaleFontParams;

            TextBlock txt;
            TextBlock txt2;

            for (int x = 0; x < quantityOfLabels; x++)
            {
                txt = new TextBlock()
                {
                    Text = ConvertDecimalString(maximumdB - (x * dbPerDiv), ""),
                    FontFamily = fontParams.FontFamily,
                    FontSize = fontParams.FontSize,
                    FontStyle = fontParams.FontStyle,
                    TextDecorations = fontParams.Decoration,
                    FontWeight = fontParams.FontWeight,
                    Foreground = new SolidColorBrush(fontParams.FontColor),
                    Width = CurvesCanvasMarginLeft - 5,
                    HorizontalTextAlignment = TextAlignment.Right,
                };
                
                Children.Add(txt);
                VerticalLeftLabels.Add(new Tuple<TextBlock, double, bool>(txt, x * LabelStep, true));

                if (ScaleParams.ComplexProjection != ComplexProjectedData.MagnitudePhase)
                {   /* these labels are also placed on right side of the graph
                    if the data is not magnitude+phase , but real+imag
                    if data is real+imag, these two quantities are on the same scale */
                    txt2 = new TextBlock()
                    {
                        Text = ConvertDecimalString(maximumdB - (x * dbPerDiv), ""),
                        FontFamily = fontParams.FontFamily,
                        FontSize = fontParams.FontSize,
                        FontStyle = fontParams.FontStyle,
                        TextDecorations = fontParams.Decoration,
                        FontWeight = fontParams.FontWeight,
                        Foreground = new SolidColorBrush(fontParams.FontColor),
                        Width = CurvesCanvasMarginLeft - 5,
                        HorizontalTextAlignment = TextAlignment.Left,
                    };

                    VerticalRightLabels.Add(new Tuple<TextBlock, double, bool>(txt2, x * LabelStep, true));
                    Children.Add(txt2);
                }

            }
        }

        private void DrawVerticalLeftLogLabels()
        {
            TextBlock txt;
            TextBlock txt2;

            decimal minimum = scaleParams.MinimumMag;
            int minExponent = (int)Math.Floor(Math.Log10(Math.Abs(Convert.ToDouble(minimum))));
            decimal minOneDigit = minimum / DecimalMath.PowerN(10, minExponent);
            int minOneDigitClean = (int)Math.Floor(minOneDigit);
            decimal minimumClean = minOneDigitClean * DecimalMath.PowerN(10, minExponent);


            decimal maximum = scaleParams.MaximumMag;
            int maxExponent = (int)Math.Floor(Math.Log10(Math.Abs(Convert.ToDouble(maximum))));
            decimal maxOneDigit = maximum / DecimalMath.PowerN(10, maxExponent);
            int maxOneDigitClean = (int)Math.Floor(maxOneDigit);
            decimal maximumClean = maxOneDigitClean * DecimalMath.PowerN(10, maxExponent);

            double expSpace = Math.Log10(Convert.ToDouble(maximumClean) / Convert.ToDouble(minimumClean));
            var fontParams = GraphParams.VerticalScaleFontParams;

            decimal currentOneDigit = minOneDigitClean;
            int currentExp = minExponent;
            
            double magPosition;
            double canvasPosition;

         
            if ((minOneDigitClean == maxOneDigitClean) && (minExponent == maxExponent))
            {
                maxOneDigitClean++;
                if (maxOneDigitClean == 10) { maxOneDigitClean = 1; maxExponent++; }
            }

            int FinalOneDigit = maxOneDigitClean;
            int FinalExponent = maxExponent;

            FinalOneDigit++;
            if (FinalOneDigit == 10) { FinalOneDigit = 1; FinalExponent++; }

            int topOneDigit = minOneDigitClean;

            while ((currentOneDigit != FinalOneDigit) || (currentExp != FinalExponent))
            {
                if (currentOneDigit > topOneDigit) topOneDigit = (int)currentOneDigit;
                currentOneDigit++;

                if (currentOneDigit == 10)
                {
                    currentOneDigit = 1;
                    currentExp++;
                }
            }

            currentOneDigit = minOneDigitClean;
            currentExp = minExponent;

            double x1 = Convert.ToDouble(topOneDigit) * Math.Pow(10, currentExp);
            double x2 = Convert.ToDouble(topOneDigit + 1) * Math.Pow(10, currentExp);
            double pos1 = Math.Log10(x1 / Convert.ToDouble(minimumClean)) / expSpace;
            double pos2 = Math.Log10(x2 / Convert.ToDouble(minimumClean)) / expSpace;

            currentLogSmallestStepVertical = (pos2 - pos1);
            
            while ((currentOneDigit != FinalOneDigit) || (currentExp != FinalExponent))
            {
                magPosition = Convert.ToDouble(currentOneDigit) * Math.Pow(10, currentExp);
                canvasPosition = Math.Log10(magPosition / Convert.ToDouble(minimumClean)) / expSpace;

                txt = new TextBlock()
                {
                    Text = ConvertDecimalString(Convert.ToDecimal(magPosition), ""),
                    FontFamily = fontParams.FontFamily,
                    FontSize = fontParams.FontSize,
                    FontStyle = fontParams.FontStyle,
                    TextDecorations = fontParams.Decoration,
                    FontWeight = fontParams.FontWeight,
                    Foreground = new SolidColorBrush(fontParams.FontColor),
                    Width = CurvesCanvasMarginLeft - 5,
                    HorizontalTextAlignment = TextAlignment.Right,
                };
           
                Children.Add(txt);
                VerticalLeftLabels.Add(new Tuple<TextBlock, double, bool>(txt, 1 - canvasPosition, (currentOneDigit == 1 || currentOneDigit == 2 || currentOneDigit == 5)));

                if (ScaleParams.ComplexProjection != ComplexProjectedData.MagnitudePhase)
                {
                    txt2 = new TextBlock()
                    {
                        Text = ConvertDecimalString(Convert.ToDecimal(magPosition), ""),
                        FontFamily = fontParams.FontFamily,
                        FontSize = fontParams.FontSize,
                        FontStyle = fontParams.FontStyle,
                        TextDecorations = fontParams.Decoration,
                        FontWeight = fontParams.FontWeight,
                        Foreground = new SolidColorBrush(fontParams.FontColor),
                        Width = CurvesCanvasMarginLeft - 5,
                        HorizontalTextAlignment = TextAlignment.Left,
                    };
                    Children.Add(txt2);
                    VerticalRightLabels.Add(new Tuple<TextBlock, double, bool>(txt2, 1 - canvasPosition, (currentOneDigit == 1 || currentOneDigit == 2 || currentOneDigit == 5)));
                }


                currentOneDigit++;
                if (currentOneDigit == 10)
                {
                    currentOneDigit = 1;
                    currentExp++;
                }
            }
        }

        private void DrawVerticalLeftLinLabels()
        {
            int quantityOfLabels = ScaleParams.QuantityOfMajorDivsVertical + 1;
            double LabelStep = 1d / ScaleParams.QuantityOfMajorDivsVertical;

            decimal maximum;
            decimal minimum;
            if (ScaleParams.MagnitudePolarity == Polarity.Bipolar)
            {
                maximum = ScaleParams.MaximumMag;
                minimum = maximum * -1;
            }
            else
            if (ScaleParams.MagnitudePolarity == Polarity.Positive)
            {
                maximum = ScaleParams.MaximumMag;
                minimum = 0;
            }
            else
            {
                /* negative */
                maximum = 0;
                minimum = ScaleParams.MinimumMag; /* this number must be negative */
            }

            var fontParams = GraphParams.VerticalScaleFontParams;
            decimal magStep = (maximum - minimum) / ScaleParams.QuantityOfMajorDivsVertical;

            TextBlock txt;
            TextBlock txt2;
            for (int x = 0; x < quantityOfLabels; x++)
            {
                txt = new TextBlock()
                {
                    Text = ConvertDecimalString(maximum - (x * magStep), CultureInfo.CurrentCulture.TwoLetterISOLanguageName),
                    FontFamily = fontParams.FontFamily,
                    FontSize = fontParams.FontSize,
                    FontStyle = fontParams.FontStyle,
                    TextDecorations = fontParams.Decoration,
                    FontWeight = fontParams.FontWeight,
                    Foreground = new SolidColorBrush(fontParams.FontColor),
                    Width = CurvesCanvasMarginLeft - 5,
                    HorizontalTextAlignment = TextAlignment.Right,
                };

                Children.Add(txt);
                VerticalLeftLabels.Add(new Tuple<TextBlock, double, bool>(txt, x * LabelStep, true));

                if (ScaleParams.ComplexProjection != ComplexProjectedData.MagnitudePhase)
                {
                    txt2 = new TextBlock()
                    {
                        Text = ConvertDecimalString(maximum - (x * magStep), CultureInfo.CurrentCulture.TwoLetterISOLanguageName),
                        FontFamily = fontParams.FontFamily,
                        FontSize = fontParams.FontSize,
                        FontStyle = fontParams.FontStyle,
                        TextDecorations = fontParams.Decoration,
                        FontWeight = fontParams.FontWeight,
                        Foreground = new SolidColorBrush(fontParams.FontColor),
                        Width = CurvesCanvasMarginLeft - 5,
                        HorizontalTextAlignment = TextAlignment.Left,
                    };
                    Children.Add(txt2);
                    VerticalRightLabels.Add(new Tuple<TextBlock, double, bool>(txt2, x * LabelStep, true));
                }


            }
        }

        public string ConvertDecimalString(decimal value, string language)
        {
            //number to string
      
            if (value == 0m) return (0m).ToString();

            decimal exponent = (int)Math.Floor(Math.Log10((double)Math.Abs(value)));
            decimal output = 0m;
            string prefix = "";
            bool hasPrefix = false;
            bool exponentOutsidePrefixes = false;
        
            if (exponent >= 0)
            {
                switch (exponent)
                {
                    case 0:
                    case 1:
                    case 2:
                        output = value; prefix = ""; hasPrefix = false; break;
                    case 3:
                    case 4:
                    case 5:
                        output = (value / 1e3m); prefix = "K"; hasPrefix = true; break;
                    case 6:
                    case 7:
                    case 8:
                        output = (value / 1e6m); prefix = "M"; hasPrefix = true; break;
                    case 9:
                    case 10:
                    case 11:
                        output = (value / 1e9m); prefix = "G"; hasPrefix = true; break;
                    case 12:
                    case 13:
                    case 14:
                        output = (value / 1e12m); prefix = "T"; hasPrefix = true; break;
                    case 15:
                    case 16:
                    case 17:
                        output = (value / 1e15m); prefix = "P"; hasPrefix = true; break;
                    case 18:
                    case 19:
                    case 20:
                        output = (value / 1e18m); prefix = "E"; hasPrefix = true; break;
                    case 21:
                    case 22:
                    case 23:
                        output = (value / 1e21m); prefix = "Z"; hasPrefix = true; break;
                    case 24:
                    case 25:
                    case 26:
                        output = (value / 1e24m); prefix = "Y"; hasPrefix = true; break;
                }

                if (exponent >= 27)
                {
                    exponentOutsidePrefixes = true;
                    output = value / (decimal)Math.Pow(10, (int)exponent);
                }
            }
            else if (exponent < 0)
            {
                switch (exponent)
                {
                    case -1:
                    case -2:
                    case -3:
                        output = (value * 1e3m); prefix = "m"; hasPrefix = true; break;
                    case -4:
                    case -5:
                    case -6:
                        output = (value * 1e6m); prefix = "μ"; hasPrefix = true; break;
                    case -7:
                    case -8:
                    case -9:
                        output = (value * 1e9m); prefix = "n"; hasPrefix = true; break;
                    case -10:
                    case -11:
                    case -12:
                        output = (value * 1e12m); prefix = "p"; hasPrefix = true; break;
                    case -13:
                    case -14:
                    case -15:
                        output = (value * 1e15m); prefix = "f"; hasPrefix = true; break;
                    case -16:
                    case -17:
                    case -18:
                        output = (value * 1e18m); prefix = "a"; hasPrefix = true; break;
                    case -19:
                    case -20:
                    case -21:
                        output = (value * 1e21m); prefix = "z"; hasPrefix = true; break;
                    case -22:
                    case -23:
                    case -24:
                        output = (value * 1e24m); prefix = "y"; hasPrefix = true; break;
                }
                if (exponent <= -25)
                {
                    exponentOutsidePrefixes = true;
                    output = value * (decimal)Math.Pow(10, Math.Abs((int)exponent));
                }
            }

            //output = decimal.Round(output, 4);
            string stOutput;

            CultureInfo culture;
            if (language == null) culture = CultureInfo.CurrentCulture;
            else
                if (language == "") culture = CultureInfo.CurrentCulture;
            else
                culture = new CultureInfo(language);

            stOutput = output.ToString("###.#", culture);
          

            if (!exponentOutsidePrefixes)
            {
                if (hasPrefix) stOutput += " " + prefix;
            }
            else
                stOutput += "E" + exponent.ToString();

            return stOutput;
        }

        private void DrawHorizontaldBDivs()
        {
            
            decimal maximum = scaleParams.MaximumdB;

            int QmajorDivs = scaleParams.QuantityOfdBDivs;
            int QminorDivs = scaleParams.QuantityOfMinorDivsVertical;

            double majorStep = CanvasHeight / QmajorDivs;
            double minorStep = majorStep / QminorDivs;

            Line l1;
            Line l2;

            for (int maj = 0; maj < QmajorDivs; maj++)
            {
                for (int min = 1; min < QminorDivs; min++) {
                    l1 = new Line()
                    {
                        X1 = 0,
                        X2 = CanvasWidth,
                        Y1 = (majorStep * maj) + (minorStep * min),
                        Y2 = (majorStep * maj) + (minorStep * min),
                        StrokeThickness = GraphParams.MinorDivStrokeThickness,
                        Stroke = MinorDivBrush
                    };
                    CurvesCanvas.Children.Add(l1);
                    HorizontalMinorDivs.Add(l1);
                }

                if (maj != 0)
                {
                    l2 = new Line()
                    {
                        X1 = 0,
                        X2 = CanvasWidth,
                        Y1 = (majorStep * maj),
                        Y2 = (majorStep * maj),
                        StrokeThickness = GraphParams.MajorDivStrokeThickness,
                        Stroke = MajorDivBrush
                    };
                    CurvesCanvas.Children.Add(l2);
                    HorizontalMajorDivs.Add(l2);
                }
            }
        }

        private void DrawHorizontalLinDivs()
        {
            decimal minimum = scaleParams.MinimumMag;
            decimal maximum = scaleParams.MaximumMag;

            int QmajorDivs = scaleParams.QuantityOfMajorDivsVertical;
            int QminorDivs = scaleParams.QuantityOfMinorDivsVertical;

            double majorStep = CanvasHeight / QmajorDivs;
            double minorStep = majorStep / QminorDivs;

            Line l1;
            Line l2;

            for (int maj = 0; maj < QmajorDivs; maj++)
            {
                for (int min = 1; min < QminorDivs; min++)
                {
                    l1 = new Line()
                    {
                        X1 = 0,
                        X2 = CanvasWidth,
                        Y1 = (majorStep * maj) + (minorStep * min),
                        Y2 = (majorStep * maj) + (minorStep * min),
                        StrokeThickness = GraphParams.MinorDivStrokeThickness,
                        Stroke = MinorDivBrush
                    };
                    CurvesCanvas.Children.Add(l1);
                    HorizontalMinorDivs.Add(l1);
                }

                if (maj != 0)
                {
                    l2 = new Line()
                    {
                        X1 = 0,
                        X2 = CanvasWidth,
                        Y1 = (majorStep * maj),
                        Y2 = (majorStep * maj),
                        StrokeThickness = GraphParams.MajorDivStrokeThickness,
                        Stroke = MajorDivBrush
                    };

                    CurvesCanvas.Children.Add(l2);
                    HorizontalMajorDivs.Add(l2);
                }
            }
        }

        private void DrawHorizontalLogDivs()
        {
            /* these horizontal lines are for the vertical scale */
            Line l1;

            decimal minimum = scaleParams.MinimumMag;
            int minExponent = (int)Math.Floor(Math.Log10(Math.Abs(Convert.ToDouble(minimum))));
            decimal minOneDigit = minimum / DecimalMath.PowerN(10, minExponent);
            int minOneDigitClean = (int)Math.Floor(minOneDigit);
            decimal minimumClean = minOneDigitClean * DecimalMath.PowerN(10, minExponent);


            decimal maximum = scaleParams.MaximumMag;
            int maxExponent = (int)Math.Floor(Math.Log10(Math.Abs(Convert.ToDouble(maximum))));
            decimal maxOneDigit = maximum / DecimalMath.PowerN(10, maxExponent);
            int maxOneDigitClean = (int)Math.Floor(maxOneDigit);
            decimal maximumClean = maxOneDigitClean * DecimalMath.PowerN(10, maxExponent);

            double expSpace = Math.Log10(Convert.ToDouble(maximumClean) / Convert.ToDouble(minimumClean));

            bool IsInteger(decimal dec) => dec % 1 == 0;

            decimal currentOneDigit = minOneDigitClean;
            int currentExp = minExponent;

            decimal intMinorDivStep = 1m / scaleParams.QuantityOfMinorDivsVertical;
            double domainPosition;
            double canvasPosition;

            if ((minOneDigitClean == maxOneDigitClean) && (minExponent == maxExponent))
            {
                maxOneDigitClean++;
                if (maxOneDigitClean == 10) { maxOneDigitClean = 1; maxExponent++; }
            }

            while ((currentOneDigit != maxOneDigitClean) || (currentExp != maxExponent))
            {
                if (!(((currentOneDigit == minOneDigitClean) && (currentExp == minExponent)) ||
                    ((currentOneDigit == maxOneDigitClean) && (currentExp == maxExponent))))
                {
                    domainPosition = Convert.ToDouble(currentOneDigit) * Math.Pow(10, currentExp);
                    canvasPosition = Math.Log10(domainPosition / Convert.ToDouble(minimumClean)) * CanvasHeight / expSpace;

                    l1 = new Line()
                    {
                        X1 = 0,
                        X2 = CanvasWidth,
                        Y1 = CanvasHeight - canvasPosition,
                        Y2 = CanvasHeight - canvasPosition,
                        StrokeThickness = IsInteger(currentOneDigit) ?
                            GraphParams.MajorDivStrokeThickness : GraphParams.MinorDivStrokeThickness,
                        Stroke = IsInteger(currentOneDigit) ? MajorDivBrush : MinorDivBrush
                    };
                    CurvesCanvas.Children.Add(l1);
                    if (IsInteger(currentOneDigit))
                        HorizontalMajorDivs.Add(l1);
                    else
                        HorizontalMinorDivs.Add(l1);
                }

                currentOneDigit += intMinorDivStep;

                if (currentOneDigit == 10)
                {
                    currentOneDigit = 1;
                    currentExp++;
                }
            }
        }

        private void DrawVerticalLogDivs()
        {
            Line l1;

            decimal minimum = scaleParams.MinimumHorizontal;
            int minExponent = (int)Math.Floor(Math.Log10(Math.Abs(Convert.ToDouble(minimum))));
            decimal minOneDigit = minimum / DecimalMath.PowerN(10, minExponent);
            int minOneDigitClean = (int)Math.Floor(minOneDigit);
            decimal minimumClean = minOneDigitClean * DecimalMath.PowerN(10, minExponent);


            decimal maximum = scaleParams.MaximumHorizontal;
            int maxExponent = (int)Math.Floor(Math.Log10(Math.Abs(Convert.ToDouble(maximum))));
            decimal maxOneDigit = maximum / DecimalMath.PowerN(10, maxExponent);
            int maxOneDigitClean = (int)Math.Floor(maxOneDigit);
            decimal maximumClean = maxOneDigitClean * DecimalMath.PowerN(10, maxExponent);

            double expSpace = Math.Log10(Convert.ToDouble(maximumClean) / Convert.ToDouble(minimumClean));

            bool IsInteger(decimal dec) => dec % 1 == 0;
            
            decimal currentOneDigit = minOneDigitClean;
            int currentExp = minExponent;

            decimal intMinorDivStep = 1m / scaleParams.QuantityOfMinorDivsHorizontal;
            double domainPosition;
            double canvasPosition;

            if ((minOneDigitClean == maxOneDigitClean) && (minExponent == maxExponent))
            {
                maxOneDigitClean++;
                if (maxOneDigitClean == 10) { maxOneDigitClean = 1; maxExponent++; }
            }

            while ((currentOneDigit != maxOneDigitClean) || (currentExp != maxExponent))
            {
                if (!(((currentOneDigit == minOneDigitClean) && (currentExp == minExponent)) ||
                    ((currentOneDigit == maxOneDigitClean) && (currentExp == maxExponent))))
                {
                    domainPosition = Convert.ToDouble(currentOneDigit) * Math.Pow(10, currentExp);
                    canvasPosition = Math.Log10(domainPosition / Convert.ToDouble(minimumClean)) * CanvasWidth / expSpace;
                    l1 = new Line()
                    {
                        X1 = canvasPosition,
                        X2 = canvasPosition,
                        Y1 = 0,
                        Y2 = CanvasHeight,
                        StrokeThickness = IsInteger(currentOneDigit) ?
                            GraphParams.MajorDivStrokeThickness : GraphParams.MinorDivStrokeThickness,
                        Stroke = IsInteger(currentOneDigit) ? MajorDivBrush : MinorDivBrush
                    };

                    CurvesCanvas.Children.Add(l1);

                    if (IsInteger(currentOneDigit))
                        VerticalMajorDivs.Add(l1);
                    else
                        VerticalMinorDivs.Add(l1);
                }

                currentOneDigit += intMinorDivStep;

                if (currentOneDigit == 10)
                {
                    currentOneDigit = 1;
                    currentExp++;
                }
            }
        }


        private void DrawVerticalLinDivs()
        {
            Line l1;
            Line l2;

            decimal minimum = scaleParams.MinimumHorizontal;
            decimal maximum = scaleParams.MaximumHorizontal;

            int QmajorDivs = scaleParams.QuantityOfMajorDivsHorizontal;
            int QminorDivs = scaleParams.QuantityOfMinorDivsHorizontal;

            double majorStep = CanvasWidth / QmajorDivs;
            double minorStep = majorStep / QminorDivs;
            

            for (int maj = 0; maj < QmajorDivs; maj++)
            {
                for (int min = 1; min < QminorDivs; min++)
                {
                    l1 = new Line()
                    {
                        X1 = (majorStep * maj) + (minorStep * min),
                        X2 = (majorStep * maj) + (minorStep * min),
                        Y1 = 0,
                        Y2 = CanvasHeight,
                        StrokeThickness = GraphParams.MinorDivStrokeThickness,
                        Stroke = MinorDivBrush
                    };
                    CurvesCanvas.Children.Add(l1);
                    VerticalMinorDivs.Add(l1);
                }

                if (maj != 0)
                {
                    l2 = new Line()
                    {
                        X1 = (majorStep * maj),
                        X2 = (majorStep * maj),
                        Y1 = 0,
                        Y2 = CanvasHeight,
                        StrokeThickness = GraphParams.MajorDivStrokeThickness,
                        Stroke = MajorDivBrush
                    };
                    CurvesCanvas.Children.Add(l2);
                    VerticalMajorDivs.Add(l2);
                }
                
            }
        }

        private void ClearAll()
        {
            CurvesCanvas.Children.Clear();
            VerticalMajorDivs.Clear();
            VerticalMinorDivs.Clear();
            HorizontalMinorDivs.Clear();
            HorizontalMajorDivs.Clear();
            ClearLabels();
            
        }


        private void ClearLabels()
        {
            foreach (var txtb in HorizontalLabels)
                Children.Remove(txtb.Item1);

            foreach (var txtb in VerticalLeftLabels)
                Children.Remove(txtb.Item1);

            foreach (var txtb in VerticalRightLabels)
                Children.Remove(txtb.Item1);

            HorizontalLabels.Clear();
            VerticalLeftLabels.Clear();
            VerticalRightLabels.Clear();
        }

        private void AddCurve(Function func)
        {
            var newPolyLineMag = new Polyline()
            {
                Stroke = new SolidColorBrush(func.StrokeColor),
                StrokeThickness = func.StrokeThickness
            };

            var newPolyLinePhase = new Polyline()
            {
                Stroke = new SolidColorBrush(func.StrokeColorLighter),
                StrokeThickness = func.StrokeThickness
            };

            dictPolylinesMag.Add(func, newPolyLineMag);
            dictPolylinesPhase.Add(func, newPolyLinePhase);

            double X;
            double YMag;
            double YPhase;

            SampledFunction sampledFunc = (func is SampledFunction) ? (SampledFunction)func : SampledFunction.RenderFunction(func);
                        
            foreach (var sample in sampledFunc.Data)
            {
                X = mapX(sample.X);
                if (!double.IsNaN(X))
                {
                    YMag = mapPointMag(sample.Y);
                    if (!double.IsNaN(YMag)) newPolyLineMag.Points.Add(new Point(X, YMag));

                    YPhase = mapPointPhase(sample.Y);
                    if (!double.IsNaN(YPhase)) newPolyLinePhase.Points.Add(new Point(X, YPhase));
                }
            }

            CurvesCanvas.Children.Add(newPolyLineMag);
            CurvesCanvas.Children.Add(newPolyLinePhase);

            func.FunctionChanged += functionChanged;
        }

        private void functionChanged(Function func, FunctionChangedEventArgs args)
        {
            var lineMag = dictPolylinesMag[func];
            var linePhase = dictPolylinesPhase[func];
            
            double X;
            double YMag;
            double YPhase;

            SampledFunction sampledFunc = (func is SampledFunction) ? (SampledFunction)func : SampledFunction.RenderFunction(func);

            int originalPointQuantity = lineMag.Points.Count;
            int newQuantity = sampledFunc.Data.Count;

            if (originalPointQuantity == newQuantity)
            {
                int sampleNumber = 0;
                foreach (var sample in sampledFunc.Data)
                {
                    X = mapX(sample.X);
                    if (!double.IsNaN(X))
                    {
                        YMag = mapPointMag(sample.Y);
                        if (!double.IsNaN(YMag)) lineMag.Points[sampleNumber] = new Point(X, YMag);
                        

                        YPhase = mapPointPhase(sample.Y);
                        if (!double.IsNaN(YPhase)) linePhase.Points[sampleNumber] = new Point(X, YPhase);
                        else { }
                    } else
                    { }
                    sampleNumber++;
                }
            }
            else
            {
                lineMag.Points.Clear();
                linePhase.Points.Clear();
                foreach (var sample in sampledFunc.Data)
                {
                    X = mapX(sample.X);
                    if (!double.IsNaN(X))
                    {
                        YMag = mapPointMag(sample.Y);
                        if (!double.IsNaN(YMag)) lineMag.Points.Add(new Point(X, YMag));

                        YPhase = mapPointPhase(sample.Y);
                        if (!double.IsNaN(YPhase)) linePhase.Points.Add(new Point(X, YPhase));
                    }
                }
            }

            if (!CurvesCanvas.Children.Contains(lineMag)) CurvesCanvas.Children.Add(lineMag);
            if (!CurvesCanvas.Children.Contains(linePhase)) CurvesCanvas.Children.Add(linePhase);


        }

        private void RemoveCurve(Function func)
        {
            var lineMag = dictPolylinesMag[func];
            var linePhase = dictPolylinesPhase[func];

            if (CurvesCanvas.Children.Contains(lineMag)) CurvesCanvas.Children.Remove(lineMag);
            if (CurvesCanvas.Children.Contains(linePhase)) CurvesCanvas.Children.Remove(linePhase);

            dictPolylinesMag.Remove(func);
            dictPolylinesPhase.Remove(func);

            func.FunctionChanged -= functionChanged;
        }

        private double mapX(decimal X)
        {
            var Xdbl = Convert.ToDouble(X) / Math.Pow(10, scaleParams.HorizontalPrefix);
            var maxHor = Convert.ToDouble(scaleParams.MaximumHorizontal);
            var minHor = Convert.ToDouble(scaleParams.MinimumHorizontal);

            double XCanvas;

            if (scaleParams.HorizontalScale == AxisScale.Linear)
                XCanvas = CanvasWidth * (Xdbl - minHor) / (maxHor - minHor);
            else
            {   /* log scale*/
                if (Xdbl <= 0) XCanvas = double.MinValue;
                else
                    XCanvas = CanvasWidth * Math.Log10(Xdbl / minHor) / Math.Log10(maxHor / minHor);
            }
            /*
            if (XCanvas < 0) return double.NaN;
            if (XCanvas > CanvasWidth) return double.NaN;*/
            return XCanvas;
        }

        private double mapPointMag(ComplexDecimal Y)
        {
            double Ymag;
            double YCanvas;
           
            if (scaleParams.VerticalScale == AxisScale.Linear)
            {
                double maxVer;
                double minVer;

                Ymag = Y.MagnitudeDouble / Math.Pow(10, scaleParams.VerticalPrefix);

                if (ScaleParams.MagnitudePolarity == Polarity.Bipolar)
                {
                    maxVer = Convert.ToDouble(scaleParams.MaximumMag);
                    minVer = maxVer * -1;
                }
                else if (ScaleParams.MagnitudePolarity == Polarity.Positive)
                {
                    maxVer = Convert.ToDouble(scaleParams.MaximumMag);
                    minVer = 0;
                }
                else
                {
                    maxVer = 0;
                    minVer = Convert.ToDouble(scaleParams.MinimumMag);
                }

                YCanvas = CanvasHeight - (CanvasHeight * (Ymag - minVer) / (maxVer - minVer));
            }
            else
            if (scaleParams.VerticalScale == AxisScale.Logarithmic)
            {
                var maxVer = Convert.ToDouble(scaleParams.MaximumMag);
                var minVer = Convert.ToDouble(scaleParams.MinimumMag);

                Ymag = Y.MagnitudeDouble / Math.Pow(10, scaleParams.VerticalPrefix);
                YCanvas = CanvasHeight - (CanvasHeight * Math.Log10(Ymag / minVer) / Math.Log10(maxVer / minVer));
            }
            else
            {
                /* dB scale */
                switch (scaleParams.DBZeroRef)
                {
                    case dBReference.dBV: Ymag = Y.TodBV; break;
                    case dBReference.dBSPL: Ymag = Y.TodBSPL; break;
                    case dBReference.dBm: Ymag = Y.TodBm; break;
                    default: Ymag = 0; break;
                }
                double mindB = Convert.ToDouble(scaleParams.MaximumdB) - Convert.ToDouble(scaleParams.DBPerDiv * scaleParams.QuantityOfdBDivs);
                double maxdB = Convert.ToDouble(scaleParams.MaximumdB);
                YCanvas = CanvasHeight - (CanvasHeight * (Ymag - mindB) / (maxdB - mindB));
            }
            /*
            if (YCanvas < 0) return double.NaN;
            if (YCanvas > CanvasHeight) return double.NaN;*/

            return YCanvas;
        }

        private double mapPointPhase(ComplexDecimal Y)
        {
            double maxVer;
            double minVer;

            if (ScaleParams.PhasePolarity == Polarity.Bipolar) {
                maxVer = Convert.ToDouble(scaleParams.MaximumPhase);
                minVer = maxVer * -1;
            }
            else if (ScaleParams.PhasePolarity == Polarity.Positive) {
                maxVer = Convert.ToDouble(scaleParams.MaximumPhase);
                minVer = 0;
            }
            else {/* Polarity.Negative */
                maxVer = 0;
                minVer = Convert.ToDouble(scaleParams.MinimumPhase);
            }
            
            double YCanvas = CanvasHeight - (CanvasHeight * (Y.PhaseDegDouble - minVer) / (maxVer - minVer));
            /*
            if (YCanvas < 0) return double.NaN;
            if (YCanvas > CanvasHeight) return double.NaN;*/
            return YCanvas;
        }
    }
}
