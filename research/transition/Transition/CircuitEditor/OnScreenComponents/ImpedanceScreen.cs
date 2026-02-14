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
    public class ImpedanceScreen : ScreenComponentBase
    {
        public override double SchematicWidth => 120;
        public override double SchematicHeight => 80;

        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 40 }, { 100, 40 } };
        }

        public TextBlock txtComponentName;
        public TextBlock txtDescription;
        public TextBlock txtPositiveSign;

        private ContentControl symbolImpedance;

        public ImpedanceScreen(Impedance imp) : base(imp)
        {
            symbolImpedance = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolImpedance"]
            };

            ComponentCanvas.Children.Add(symbolImpedance);
            Canvas.SetTop(symbolImpedance, 19);
            Canvas.SetLeft(symbolImpedance, 19);

            txtComponentName = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = imp
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.RenderTransform = new TranslateTransform() { };
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);

            txtDescription = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b2 = new Binding()
            {
                Path = new PropertyPath("Description"),
                Mode = BindingMode.OneWay,
                Source = imp
            };
            txtDescription.SetBinding(TextBlock.TextProperty, b2);
            txtDescription.RenderTransform = new TranslateTransform() { };
            txtDescription.SizeChanged += delegate { setPositionTextBoxes(this.SerializableComponent); };
            Children.Add(txtDescription);


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
            double leftDesc; double topDesc;
            double leftCN; double topCN;

            if ((ActualRotation == 0) || (ActualRotation == 180))
            {
                topCN = 0;
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topDesc = 30;
                leftDesc = (SchematicWidth / 2) - (txtDescription.ActualWidth / 2);
            }
            else
            {
                topCN = 60 - (txtComponentName.ActualHeight / 2);
                leftCN = 20 - (txtComponentName.ActualWidth);
                topDesc = 60 - (txtDescription.ActualHeight / 2);
                leftDesc = SchematicHeight - 20;
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtDescription.RenderTransform).X = leftDesc;
            ((TranslateTransform)txtDescription.RenderTransform).Y = topDesc;

            bool showPositiveSign = ((Impedance)SerializableComponent).OutputVoltageAcross ||
                                    ((Impedance)SerializableComponent).OutputCurrentThrough;

            txtPositiveSign.Visibility = showPositiveSign ? Visibility.Visible : Visibility.Collapsed;
        }
    }
}
