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
    public class PotentiometerScreen : ScreenComponentBase
    {
        public override double SchematicWidth => 120;
        public override double SchematicHeight => 160;

        public override int[,] TerminalPositions
        {
            get
            {
                if (QuantityOfTerminals == 3)
                    { return new int[,] { { 40, 140 }, { 40, 20 }, { 100, 80 } }; }
                else
                if (QuantityOfTerminals == 4)
                    { return new int[,] { { 40, 140 }, { 40, 20 }, { 100, 80 }, { 20, 80 } }; }
                else
                if (QuantityOfTerminals == 5)
                    { return new int[,] { { 40, 140 }, { 40, 20 }, { 100, 80 }, { 20, 100 }, { 20, 60 } }; }
                else /* 6 */
                    { return new int[,] { { 40, 140 }, { 40, 20 }, { 100, 80 }, { 20, 100 }, { 20, 80 }, { 20, 60 } }; }
            }
        }

        public TextBlock txtCW;
        public TextBlock txtCCW;
        public TextBlock txtResistanceValue;
        public TextBlock txtPositionValue;
        public TextBlock txtComponentName;

        public ContentControl SymbolPotentiometer { get; }


        public PotentiometerScreen(Potentiometer pot) : base(pot)
        {
            SymbolPotentiometer = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolPotentiometer"]
            };
            ComponentCanvas.Children.Add(SymbolPotentiometer);
            Canvas.SetTop(SymbolPotentiometer, 19);
            Canvas.SetLeft(SymbolPotentiometer, 19);

            pot.TerminalsChanged += terminalsChanged;
        
            txtComponentName = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform(),
            };

            txtResistanceValue = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            txtPositionValue = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            txtCW = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform(),
                Text = "CW"
            };
            Children.Add(txtCW);

            txtCCW = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform(),
                Text = "CCW"
            };
            Children.Add(txtCCW);

            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = pot
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);


            Binding b2 = new Binding()
            {
                Path = new PropertyPath("ResistanceString"),
                Mode = BindingMode.OneWay,
                Source = pot
            };
            txtResistanceValue.SetBinding(TextBlock.TextProperty, b2);
            txtResistanceValue.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtResistanceValue);


            Binding b3 = new Binding()
            {
                Path = new PropertyPath("PositionValue"),
                Mode = BindingMode.OneWay,
                Converter = new PotValueConverter(),
                Source = pot
            };
            txtPositionValue.SetBinding(TextBlock.TextProperty, b3);
            txtPositionValue.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtPositionValue);

         
            postConstruct();
        }

        private void terminalsChanged(byte oldValue, byte newValue)
        {
            switch (QuantityOfTerminals)
            {
                case 3:
                    SymbolPotentiometer.ContentTemplate =
                        (DataTemplate)Application.Current.Resources["symbolPotentiometer"];
                    break;
                case 4:
                    SymbolPotentiometer.ContentTemplate =
                        (DataTemplate)Application.Current.Resources["symbolPotentiometer1MidPoint"];
                    break;
                case 5:
                    SymbolPotentiometer.ContentTemplate =
                        (DataTemplate)Application.Current.Resources["symbolPotentiometer2MidPoint"];
                    break;
                case 6:
                    SymbolPotentiometer.ContentTemplate =
                        (DataTemplate)Application.Current.Resources["symbolPotentiometer3MidPoint"];
                    break;
            }
            
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
                    Terminals.Add(t);Children.Add(t);
                }
            }
            
        }

        public override void setPositionTextBoxes(SerializableElement el)
        {

            double leftRV; double topRV;
            double leftCN; double topCN;
            double leftPV; double topPV;
            double leftCW; double topCW;
            double leftCCW; double topCCW;

            if (ActualRotation == 0)
            {
                if (!FlipX)
                {
                    topCN = 20;
                    leftCN = 60;
                    topRV = 40;
                    leftRV = 60;
                    topPV = 100;
                    leftPV = 60;


                    leftCW = 20 - txtCW.ActualWidth;
                    leftCCW = 20 - txtCCW.ActualWidth;
                    if (FlipY)
                    {
                        topCCW = 20;
                        topCW = 120;
                    }
                    else
                    {
                        topCW = 20;
                        topCCW = 120;
                    }
                }
                else
                {
                    topCN = 20;
                    leftCN = 60 - txtComponentName.ActualWidth;
                    topRV = 40;
                    leftRV = 60 - txtResistanceValue.ActualWidth;
                    topPV = 100;
                    leftPV = 60 - txtPositionValue.ActualWidth;

                    leftCW = 100;
                    leftCCW = 100;

                    if (FlipY)
                    {
                        topCCW = 20;
                        topCW = 120;
                    }
                    else
                    {
                        topCW = 20;
                        topCCW = 120;
                    }
                }

            }
            else if (ActualRotation == 90)
            {
                if (!FlipX)
                {
                    topCN = 80;
                    leftCN = 100;
                    topRV = 60;
                    leftRV = 100;
                    topPV = 60;
                    leftPV = 60 - txtPositionValue.ActualWidth;

                    topCW = 00;
                    topCCW = 00;

                    if (FlipY)
                    {
                        leftCW = 0;
                        leftCCW = 120;
                    }
                    else
                    {
                        leftCW = 120;
                        leftCCW = 0;
                    }
                }
                else
                {
                    topCN = 20;
                    leftCN = 100;
                    topRV = 40;
                    leftRV = 100;
                    topPV = 40;
                    leftPV = 60 - txtPositionValue.ActualWidth;

                    topCW = 100;
                    topCCW = 100;

                    if (FlipY)
                    {
                        leftCW = 00;
                        leftCCW = 120;
                    }
                    else
                    {
                        leftCW = 120;
                        leftCCW = 0;
                    }
                }
            }
            else if (ActualRotation == 180)
            {
                if (!FlipX)
                {
                    topCN = 20;
                    leftCN = 60 - txtComponentName.ActualWidth;
                    topRV = 40;
                    leftRV = 60 - txtResistanceValue.ActualWidth;
                    topPV = 100;
                    leftPV = 60 - txtPositionValue.ActualWidth;

                    leftCW = 100;
                    leftCCW = 100;

                    if (FlipY)
                    {
                        topCCW = 120;
                        topCW = 20;
                    }
                    else
                    {
                        topCW = 120;
                        topCCW = 20;
                    }
                }
                else
                {
                    topCN = 20;
                    leftCN = 60;
                    topRV = 40;
                    leftRV = 60;
                    topPV = 100;
                    leftPV = 60;

                    leftCW = 20 - txtCW.ActualWidth;
                    leftCCW = 20 - txtCCW.ActualWidth;

                    if (FlipY)
                    {
                        topCCW = 120;
                        topCW = 20;
                    }
                    else
                    {
                        topCW = 120;
                        topCCW = 20;
                    }
                }
            }
            else
            {/* rotation = 270 */
                if (!FlipX)
                {
                    topCN = 120;
                    leftCN = 120;
                    topRV = 100;
                    leftRV = 120;
                    topPV = 100;
                    leftPV = 40 - txtPositionValue.ActualWidth;

                    topCW = 40;
                    topCCW = 40;

                    if (FlipY)
                    {
                        leftCW = 120;
                        leftCCW = 20;
                    }
                    else
                    {
                        leftCW = 20;
                        leftCCW = 120;
                    }
                }
                else
                {
                    topCN = -20;
                    leftCN = 120;
                    topRV = 00;
                    leftRV = 120;
                    topPV = 00;
                    leftPV = 40 - txtPositionValue.ActualWidth;

                    topCW = 60;
                    topCCW = 60;

                    if (FlipY)
                    {
                        leftCW = 120;
                        leftCCW = 20;
                    }
                    else
                    {
                        leftCW = 20;
                        leftCCW = 120;
                    }
                }
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;
            ((TranslateTransform)txtPositionValue.RenderTransform).X = leftPV;
            ((TranslateTransform)txtPositionValue.RenderTransform).Y = topPV;
            ((TranslateTransform)txtResistanceValue.RenderTransform).X = leftRV;
            ((TranslateTransform)txtResistanceValue.RenderTransform).Y = topRV;

            ((TranslateTransform)txtCW.RenderTransform).X = leftCW;
            ((TranslateTransform)txtCW.RenderTransform).Y = topCW;
            ((TranslateTransform)txtCCW.RenderTransform).X = leftCCW;
            ((TranslateTransform)txtCCW.RenderTransform).Y = topCCW;
        }
    }

    public class PotValueConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            //number to string
            if (value == null) return "";
            double dvalue = (double)value;
            decimal devalue = Decimal.Round((decimal)dvalue, 2);

            return devalue.ToString() + " %";
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            throw new NotImplementedException();
        }
    }
}