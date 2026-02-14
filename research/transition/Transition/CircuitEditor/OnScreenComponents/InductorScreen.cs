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
    public class InductorScreen : ScreenComponentBase
    {
        public override double SchematicWidth => 120;
        public override double SchematicHeight => 80;

        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 40 }, { 100, 40 } };
        }

        public TextBlock txtComponentName;
        public TextBlock txtInductorValue;
        public TextBlock txtPositiveSign;


        public InductorScreen(Inductor inductor) : base(inductor)
        {
            ContentControl symbolInductor = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolInductor"]
            };

            ComponentCanvas.Children.Add(symbolInductor);
            Canvas.SetTop(symbolInductor, 19);
            Canvas.SetLeft(symbolInductor, 19);
            
            txtComponentName = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = inductor
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.RenderTransform = new TranslateTransform() { };
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);
            
            txtInductorValue = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b2 = new Binding()
            {
                Path = new PropertyPath("ValueString"),
                Mode = BindingMode.OneWay,
                Source = inductor
            };
            txtInductorValue.SetBinding(TextBlock.TextProperty, b2);
            txtInductorValue.RenderTransform = new TranslateTransform() { };
            txtInductorValue.SizeChanged += delegate { setPositionTextBoxes(this.SerializableComponent); };
            Children.Add(txtInductorValue);


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


        public override void setPositionTextBoxes(SerializableElement el)
        {
            double leftRV; double topRV;
            double leftCN; double topCN;

            if ((ActualRotation == 0) || (ActualRotation == 180))
            {
                topCN = 0;
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topRV = 60;
                leftRV = (SchematicWidth / 2) - (txtInductorValue.ActualWidth / 2);
            }
            else
            {
                topCN = 60 - (txtComponentName.ActualHeight / 2);
                leftCN = 20 - (txtComponentName.ActualWidth);
                topRV = 60 - (txtInductorValue.ActualHeight / 2);
                leftRV = SchematicHeight - 20;
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtInductorValue.RenderTransform).X = leftRV;
            ((TranslateTransform)txtInductorValue.RenderTransform).Y = topRV;

            bool showPositiveSign = ((Inductor)SerializableComponent).OutputVoltageAcross ||
                                    ((Inductor)SerializableComponent).OutputCurrentThrough;

            txtPositiveSign.Visibility = showPositiveSign ? Visibility.Visible : Visibility.Collapsed;
        }
    }
}
