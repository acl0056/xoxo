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
    public class CapacitorScreen : ScreenComponentBase
    {
        public TextBlock txtComponentName;
        public TextBlock txtCapacitorValue;
        public TextBlock txtPositiveSign;

        public override double SchematicWidth => 120;
        public override double SchematicHeight => 80;
        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 40 }, { 100, 40 } };
        }

        public ContentControl SymbolCapacitor { get; }

        public CapacitorScreen(Capacitor capacitor) : base(capacitor)
        {
            SymbolCapacitor = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolCapacitor"]
            };

            ComponentCanvas.Children.Add(SymbolCapacitor);
            Canvas.SetTop(SymbolCapacitor, 19);
            Canvas.SetLeft(SymbolCapacitor, 19);

            txtComponentName = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };
            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = capacitor
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);


            txtCapacitorValue = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            Binding b2 = new Binding()
            {
                Path = new PropertyPath("ValueString"),
                Mode = BindingMode.OneWay,
                Source = capacitor
            };
            txtCapacitorValue.SetBinding(TextBlock.TextProperty, b2);
            txtCapacitorValue.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtCapacitorValue);


            txtPositiveSign = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                Text = "+",
                Visibility = Visibility.Collapsed
            };

            ComponentCanvas.Children.Add(txtPositiveSign);
            Canvas.SetTop(txtPositiveSign, 19);
            Canvas.SetLeft(txtPositiveSign, 19);
            


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
                leftRV = (SchematicWidth / 2) - (txtCapacitorValue.ActualWidth / 2);
            }
            else
            {
                topCN = 60 - (txtComponentName.ActualHeight / 2);
                leftCN = 20 - (txtComponentName.ActualWidth);
                topRV = 60 - (txtCapacitorValue.ActualHeight / 2);
                leftRV = SchematicHeight - 20;
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtCapacitorValue.RenderTransform).X = leftRV;
            ((TranslateTransform)txtCapacitorValue.RenderTransform).Y = topRV;

            bool showPositiveSign = ((Capacitor)SerializableComponent).OutputVoltageAcross ||
                                    ((Capacitor)SerializableComponent).OutputCurrentThrough;

            txtPositiveSign.Visibility = showPositiveSign ? Visibility.Visible : Visibility.Collapsed;
        }

    }
}
