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
    public class FDNRScreen : ScreenComponentBase
    {
        public override double SchematicWidth => 120;
        public override double SchematicHeight => 80;
        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 40 }, { 100, 40 } };
        }

        public TextBlock txtComponentName;
        public TextBlock txtFdnrValue;
        public TextBlock txtPositiveSign;

        public ContentControl SymbolFdnr { get; }
     
        public FDNRScreen(FDNR fdnr) : base(fdnr)
        {
            SymbolFdnr = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolFdnr"]
            };

            ComponentCanvas.Children.Add(SymbolFdnr);
            Canvas.SetTop(SymbolFdnr, 19);
            Canvas.SetLeft(SymbolFdnr, 19);

            txtComponentName = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = fdnr
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.RenderTransform = new TranslateTransform() { };
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(this.SerializableComponent); };
            Children.Add(txtComponentName);


            txtFdnrValue = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b2 = new Binding()
            {
                Path = new PropertyPath("ValueString"),
                Mode = BindingMode.OneWay,
                Source = fdnr
            };
            txtFdnrValue.SetBinding(TextBlock.TextProperty, b2);
            txtFdnrValue.RenderTransform = new TranslateTransform() { };
            txtFdnrValue.SizeChanged += delegate { setPositionTextBoxes(this.SerializableComponent); };
            Children.Add(txtFdnrValue);

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
                leftRV = (SchematicWidth / 2) - (txtFdnrValue.ActualWidth / 2);
            }
            else
            {
                topCN = 60 - (txtComponentName.ActualHeight / 2);
                leftCN = 20 - (txtComponentName.ActualWidth);
                topRV = 60 - (txtFdnrValue.ActualHeight / 2);
                leftRV = SchematicHeight - 20;
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtFdnrValue.RenderTransform).X = leftRV;
            ((TranslateTransform)txtFdnrValue.RenderTransform).Y = topRV;

            bool showPositiveSign = ((FDNR)SerializableComponent).OutputVoltageAcross ||
                                    ((FDNR)SerializableComponent).OutputCurrentThrough;

            txtPositiveSign.Visibility = showPositiveSign ? Visibility.Visible : Visibility.Collapsed;
        }
    }
}
