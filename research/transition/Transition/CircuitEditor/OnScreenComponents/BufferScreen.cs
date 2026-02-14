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
    public class BufferScreen : ScreenComponentBase
    {
        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 60 }, { 140, 60 } };
        }

        public override double SchematicWidth => 160;
        public override double SchematicHeight => 120;

        private ContentControl SymbolBuffer;
        private TextBlock txtComponentName;
        private TextBlock txtPolarity;
        private TextBlock txtDelay;
        private TextBlock txtGain;


        public BufferScreen(Serializable.Buffer buf) : base(buf)
        {
            SymbolBuffer = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolBuffer"]
            };

            ComponentCanvas.Children.Add(SymbolBuffer);
            Canvas.SetTop(SymbolBuffer, 19);
            Canvas.SetLeft(SymbolBuffer, 19);

            txtComponentName = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };




            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = buf
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);

            txtPolarity = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform(),
                FontSize = 18
            };



            Binding b2 = new Binding()
            {
                Path = new PropertyPath("InverterInput"),
                Mode = BindingMode.OneWay,
                Source = buf,
                Converter = new PolarityStringValueConverter()
            };
            txtPolarity.SetBinding(TextBlock.TextProperty, b2);
            txtPolarity.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtPolarity);

            txtGain = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };



            Binding b3 = new Binding()
            {
                Path = new PropertyPath("Gain"),
                Mode = BindingMode.OneWay,
                Source = buf,
                Converter = new GainEngrConverter() 
            };
            txtGain.SetBinding(TextBlock.TextProperty, b3);
            txtGain.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtGain);



            txtDelay = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };
            
            Binding b4 = new Binding()
            {
                Path = new PropertyPath("Delay"),
                Mode = BindingMode.OneWay,
                Source = buf,
                Converter = new DelayEngrConverter() 
            };
            txtDelay.SetBinding(TextBlock.TextProperty, b4);
            txtDelay.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtDelay);


            postConstruct();
        }

        public override void setPositionTextBoxes(SerializableElement element)
        {
            double leftCN; double topCN;
            double leftPL; double topPL;
            double leftGT; double topGT;
            double leftDT; double topDT;

            if ((ActualRotation == 0) || (ActualRotation == 180))
            {
                topCN = 0;
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);

                topPL = (SchematicHeight / 2) - (txtPolarity.ActualHeight / 2);
                leftPL = (SchematicWidth / 2) - (txtPolarity.ActualWidth / 2) + (FlipX ^ (ActualRotation >= 180) ? 10 : -10);

                topGT = 100;
                leftGT = (SchematicWidth / 2) - (txtGain.ActualWidth / 2);

                topDT = 120;
                leftDT = (SchematicWidth / 2) - (txtGain.ActualWidth / 2);

            }
            else
            {
                topCN = 80 - (txtComponentName.ActualHeight / 2);
                leftCN = 20 - (txtComponentName.ActualWidth);

                topPL = (SchematicWidth / 2) - (txtPolarity.ActualHeight / 2) + (FlipX ^ (ActualRotation >= 180) ? 10 : -10);
                leftPL = (SchematicHeight / 2) - (txtPolarity.ActualWidth / 2);

                topGT = 60 - (txtGain.ActualHeight / 2);
                leftGT = 100;

                topDT = 80 - (txtDelay.ActualHeight / 2);
                leftDT = 100;
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtPolarity.RenderTransform).X = leftPL;
            ((TranslateTransform)txtPolarity.RenderTransform).Y = topPL;

            ((TranslateTransform)txtGain.RenderTransform).X = leftGT;
            ((TranslateTransform)txtGain.RenderTransform).Y = topGT;

            ((TranslateTransform)txtDelay.RenderTransform).X = leftDT;
            ((TranslateTransform)txtDelay.RenderTransform).Y = topDT;

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
        
        public class DelayEngrConverter : IValueConverter
        {
            public object Convert(object value, Type targetType, object parameter, string language)
            {
                //number to string
                if (value == null) return "";
                var decNumber = (decimal)value;

                return "T: " + decNumber.ToString();
            }

            public object ConvertBack(object value, Type targetType, object parameter, string language)
            {
                return null;
            }
        }

        public class GainEngrConverter : IValueConverter
        {
            public object Convert(object value, Type targetType, object parameter, string language)
            {
                //number to string
                if (value == null) return "";
                var engrNumber = (decimal)value;

                return "A: " + engrNumber.ToString();
            }

            public object ConvertBack(object value, Type targetType, object parameter, string language)
            {
                return null;
            }
        }
    }
}
