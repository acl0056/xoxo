using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class SummerScreen : ScreenComponentBase
    {
        public override int[,] TerminalPositions
        {
            get
            {   /* terminal 0 is the output , others terminals are the inputs */
                if (QuantityOfTerminals == 3)
                { return new int[,] { { 140, 80 }, { 80, 20 }, { 80, 140 } }; }
                else
                { return new int[,] { { 140, 80 }, { 80, 20 }, { 80, 140 }, { 20, 80 } }; }
            }
        }

        public override double SchematicWidth => 160;
        public override double SchematicHeight => 160;

        public ContentControl SymbolSummer { get; }

        private TextBlock txtComponentName;
        private TextBlock txtInvertingInputA;
        private TextBlock txtInvertingInputB;
        private TextBlock txtInvertingInputC;

        private TextBlock txtA;
        private TextBlock txtB;
        private TextBlock txtC;


        public SummerScreen(Summer sum) : base(sum)
        {
            sum.TerminalsChanged += TerminalsChanged;

            SymbolSummer = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolSummer2Input"]
            };

            ComponentCanvas.Children.Add(SymbolSummer);
            Canvas.SetTop(SymbolSummer, 19);
            Canvas.SetLeft(SymbolSummer, 19);

            var b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = sum
            };

            txtComponentName = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform() { X = 120, Y = 20 }
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);



            txtInvertingInputA = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            var b2 = new Binding()
            {
                Path = new PropertyPath("InAInverterInput"),
                Mode = BindingMode.OneWay,
                Source = sum,
                Converter = new PolarityStringValueConverter()
            };
            txtInvertingInputA.SetBinding(TextBlock.TextProperty, b2);
            txtInvertingInputA.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtInvertingInputA);



            txtInvertingInputB = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            var b3 = new Binding()
            {
                Path = new PropertyPath("InBInverterInput"),
                Mode = BindingMode.OneWay,
                Source = sum,
                Converter = new PolarityStringValueConverter()
            };
            txtInvertingInputB.SetBinding(TextBlock.TextProperty, b3);
            txtInvertingInputB.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtInvertingInputB);



            txtInvertingInputC = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            var b4 = new Binding()
            {
                Path = new PropertyPath("InCInverterInput"),
                Mode = BindingMode.OneWay,
                Source = sum,
                Converter = new PolarityStringValueConverter()
            };
            txtInvertingInputC.SetBinding(TextBlock.TextProperty, b4);
            txtInvertingInputC.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtInvertingInputC);

            txtA = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform(),
                Text = "A"
            };
            Children.Add(txtA);
            
            txtB = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform(),
                Text = "B"
            };
            Children.Add(txtB);

            txtC = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform(),
                Text = "C"
            };
            Children.Add(txtC);
            
            Visibility vis = (QuantityOfTerminals == 3) ? Visibility.Collapsed : Visibility.Visible;
            txtInvertingInputC.Visibility = vis;
            txtC.Visibility = vis;

            postConstruct();

        }

        public override void setPositionTextBoxes(SerializableElement element)
        {
            double leftPA; double topPA;
            double leftPB; double topPB;
            double leftPC; double topPC;

            double leftTA = 0; double topTA = 0;
            double leftTB = 0; double topTB = 0;
            double leftTC = 0; double topTC = 0;


            if (ActualRotation == 0)
            {
                leftPA = 80 - (txtInvertingInputA.ActualWidth / 2);
                leftPB = 80 - (txtInvertingInputB.ActualWidth / 2);
                topPC = 80 - (txtInvertingInputC.ActualHeight / 2);

                leftTA = 90;
                leftTB = 90;
                topTC = 70 - txtC.ActualHeight;

                if (!FlipY)
                {
                    topPA = 50 - (txtInvertingInputA.ActualHeight / 2);
                    topPB = 110 - (txtInvertingInputB.ActualHeight / 2);
                    topTA = 40 - txtA.ActualHeight;
                    topTB = 140 - txtB.ActualHeight;
                }
                else
                {
                    topPA = 110 - (txtInvertingInputA.ActualHeight / 2);
                    topPB = 50 - (txtInvertingInputB.ActualHeight / 2);
                    topTA = 140 - txtA.ActualHeight;
                    topTB = 40 - txtB.ActualHeight;
                }

                if (!FlipX)
                {
                    leftPC = 50 - (txtInvertingInputC.ActualWidth / 2);
                    leftTC = 30 - txtC.ActualWidth;
                }
                else
                {
                    leftPC = 110 - (txtInvertingInputC.ActualWidth / 2);
                    leftTC = 140 - txtC.ActualWidth;
                }

            }
            else if (ActualRotation == 90)
            {
                topPA = 80 - (txtInvertingInputA.ActualHeight / 2);
                topPB = 80 - (txtInvertingInputB.ActualHeight / 2);
                leftPC = 80 - (txtInvertingInputC.ActualWidth / 2);

                topTA = 70 - txtA.ActualHeight;
                topTB = 70 - txtB.ActualHeight;
                leftTC = 90;

                if (!FlipY)
                {
                    leftPA = 110 - (txtInvertingInputA.ActualWidth / 2);
                    leftPB = 50 - (txtInvertingInputB.ActualWidth / 2);
                    leftTA = 140 - txtA.ActualWidth;
                    leftTB = 30 - txtB.ActualWidth;
                }
                else
                {
                    leftPA = 50 - (txtInvertingInputA.ActualWidth / 2);
                    leftPB = 110 - (txtInvertingInputB.ActualWidth / 2);
                    leftTA = 30 - txtB.ActualWidth;
                    leftTB = 140 - txtA.ActualWidth;
                }

                if (!FlipX)
                {
                    topPC = 50 - (txtInvertingInputC.ActualHeight / 2);
                    topTC = 40 - txtC.ActualHeight;
                }
                else
                {
                    topPC = 110 - (txtInvertingInputC.ActualHeight / 2);
                    topTC = 140 - txtC.ActualHeight;
                }
            }
            else if (ActualRotation == 180)
            {
                leftPA = 80 - (txtInvertingInputA.ActualWidth / 2);
                leftPB = 80 - (txtInvertingInputB.ActualWidth / 2);
                topPC = 80 - (txtInvertingInputC.ActualHeight / 2);


                leftTA = 90;
                leftTB = 90;
                topTC = 70 - txtC.ActualHeight;

                if (!FlipY)
                {
                    topPA = 110 - (txtInvertingInputA.ActualHeight / 2);
                    topPB = 50 - (txtInvertingInputB.ActualHeight / 2);
                    topTA = 140 - txtB.ActualHeight;
                    topTB = 40 - txtA.ActualHeight;
                  
                }
                else
                {
                    topPA = 50 - (txtInvertingInputA.ActualHeight / 2);
                    topPB = 110 - (txtInvertingInputB.ActualHeight / 2);
                    topTA = 40 - txtA.ActualHeight;
                    topTB = 140 - txtB.ActualHeight;
                }
                if (!FlipX)
                {
                    leftPC = 110 - (txtInvertingInputC.ActualWidth / 2);
                    leftTC = 140 - txtC.ActualWidth;
                }
                else
                {
                    leftPC = 50 - (txtInvertingInputC.ActualWidth / 2);
                    leftTC = 30 - txtC.ActualWidth;
                }
            }
            else
            { /* ActualRotation == 270 */
                topPA = 80 - (txtInvertingInputA.ActualHeight / 2);
                topPB = 80 - (txtInvertingInputB.ActualHeight / 2);
                leftPC = 80 - (txtInvertingInputC.ActualWidth / 2);

                topTA = 70 - txtA.ActualHeight;
                topTB = 70 - txtB.ActualHeight;
                leftTC = 90;

                if (!FlipY)
                {
                    leftPA = 50 - (txtInvertingInputA.ActualWidth / 2);
                    leftPB = 110 - (txtInvertingInputB.ActualWidth / 2);
                    leftTA = 30 - txtA.ActualWidth;
                    leftTB = 140 - txtB.ActualWidth;
                }
                else
                {
                    leftPA = 110 - (txtInvertingInputA.ActualWidth / 2);
                    leftPB = 50 - (txtInvertingInputB.ActualWidth / 2);
                    leftTA = 140 - txtA.ActualWidth;
                    leftTB = 30 - txtB.ActualWidth;
                }
                if (!FlipX)
                {
                    topPC = 110 - (txtInvertingInputC.ActualHeight / 2);
                    topTC = 140 - txtC.ActualHeight;
                }
                else
                {
                    topPC = 50 - (txtInvertingInputC.ActualHeight / 2);
                    topTC = 40 - txtC.ActualHeight;
                }
            }
            
            ((TranslateTransform)txtInvertingInputA.RenderTransform).X = leftPA;
            ((TranslateTransform)txtInvertingInputA.RenderTransform).Y = topPA;

            ((TranslateTransform)txtInvertingInputB.RenderTransform).X = leftPB;
            ((TranslateTransform)txtInvertingInputB.RenderTransform).Y = topPB;

            ((TranslateTransform)txtInvertingInputC.RenderTransform).X = leftPC;
            ((TranslateTransform)txtInvertingInputC.RenderTransform).Y = topPC;


            ((TranslateTransform)txtA.RenderTransform).X = leftTA;
            ((TranslateTransform)txtA.RenderTransform).Y = topTA;
            
            ((TranslateTransform)txtB.RenderTransform).X = leftTB;
            ((TranslateTransform)txtB.RenderTransform).Y = topTB;

            ((TranslateTransform)txtC.RenderTransform).X = leftTC;
            ((TranslateTransform)txtC.RenderTransform).Y = topTC;
        }

        private void TerminalsChanged(byte oldValue, byte newValue)
        {
            switch (QuantityOfTerminals)
            {
                case 3:
                    SymbolSummer.ContentTemplate =
                        (DataTemplate)Application.Current.Resources["symbolSummer2Input"];
                    break;
                case 4:
                    SymbolSummer.ContentTemplate =
                        (DataTemplate)Application.Current.Resources["symbolSummer3Input"];
                    break;
            }
            
            Visibility vis = (QuantityOfTerminals == 3) ? Visibility.Collapsed : Visibility.Visible;
            txtInvertingInputC.Visibility = vis;
            txtC.Visibility = vis;

            if (newValue < oldValue)
            {
                ElementTerminal t;

                for (byte x = oldValue; x > newValue; x--)
                {
                    t = Terminals[x - 1];
                    Terminals.Remove(t);
                    Children.Remove(t);
                }
            }

            if (newValue > oldValue)
            {
                ElementTerminal t;

                for (byte x = oldValue; x < newValue; x++)
                {
                    t = new ElementTerminal(x, this);
                    Terminals.Add(t); Children.Add(t);
                }
            }
        }

        public class PolarityStringValueConverter : IValueConverter
        {
            public object Convert(object value, Type targetType, object parameter, string language)
            {
                //bool to string
                if (value == null) return "";
                bool bvalue = (bool)value;

                return bvalue ? "-" : "+";
            }

            public object ConvertBack(object value, Type targetType, object parameter, string language)
            {
                throw new NotImplementedException();
            }
        }
    }
}
