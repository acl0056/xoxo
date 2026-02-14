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
    public class ResistorScreen : ScreenComponentBase
    {
        public TextBlock txtComponentName;
        public TextBlock txtResistanceValue;
        public TextBlock txtPositiveSign;

        public override double SchematicWidth => 120;
        public override double SchematicHeight => 80;

        public ContentControl SymbolResistor { get; }
        
        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 40 }, { 100, 40 } };
        }

        public ResistorScreen(Resistor resistor) : base(resistor)
        {
            SymbolResistor = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolResistor"]
            };

            ComponentCanvas.Children.Add(SymbolResistor);
            Canvas.SetTop(SymbolResistor, 19);
            Canvas.SetLeft(SymbolResistor, 19);

            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = resistor
            };

            txtComponentName = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);
            
            txtResistanceValue = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            Binding b2 = new Binding()
            {
                Path = new PropertyPath("ValueString"),
                Mode = BindingMode.OneWay,
                Source = resistor
            };
            txtResistanceValue.SetBinding(TextBlock.TextProperty, b2);
            txtResistanceValue.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtResistanceValue);

            txtPositiveSign = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                Text = "+"
            };

            ComponentCanvas.Children.Add(txtPositiveSign);
            Canvas.SetTop(txtPositiveSign, 19);
            Canvas.SetLeft(txtPositiveSign, 19);

            txtPositiveSign.Visibility = Visibility.Collapsed;

            postConstruct();

        }


        public override void setPositionTextBoxes(SerializableElement element)
        {
            double leftRV; double topRV;
            double leftCN; double topCN;

            if ((ActualRotation == 0) || (ActualRotation == 180))
            {
                topCN = 0;
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topRV = 60;
                leftRV = (SchematicWidth / 2) - (txtResistanceValue.ActualWidth / 2);
            }
            else
            {
                topCN = 60 - (txtComponentName.ActualHeight / 2);
                leftCN = 20 - (txtComponentName.ActualWidth);
                topRV = 60 - (txtResistanceValue.ActualHeight / 2);
                leftRV = SchematicHeight - 20;
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtResistanceValue.RenderTransform).X = leftRV;
            ((TranslateTransform)txtResistanceValue.RenderTransform).Y = topRV;

            bool showPositiveSign = ((Resistor)SerializableComponent).OutputVoltageAcross ||
                                    ((Resistor)SerializableComponent).OutputCurrentThrough;

            txtPositiveSign.Visibility = showPositiveSign ? Visibility.Visible : Visibility.Collapsed;
        }

    }
}
