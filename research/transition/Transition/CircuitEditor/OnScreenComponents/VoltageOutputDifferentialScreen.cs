using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Windows.UI;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Shapes;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class VoltageOutputDifferentialScreen : ScreenComponentBase
    {
        public override int[,] TerminalPositions { get => new int[,] { { 60, 20 }, { 60, 100 } }; }

        public override double SchematicWidth => 120;
        public override double SchematicHeight => 120;

        private VoltageOutputDifferential Vod;

        public TextBlock txtComponentName;
        public TextBlock txtDescription;
        public TextBlock txtV;

        private ContentControl SymbolVoltmeter;

        public override void setPositionTextBoxes(SerializableElement element)
        {
            double leftCN; double topCN;
            double leftD; double topD;

            if (ActualRotation == 0)
            {
                leftCN = 90;
                topCN = 20;

                leftD = 90;
                topD = 40;
            }
            else if (ActualRotation == 90)
            {
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topCN = 10;

                leftD = (SchematicWidth / 2) - (txtDescription.ActualWidth / 2);
                topD = 90;

            }
            else if (ActualRotation == 180)
            {
                leftCN = 90;
                topCN = 20;

                leftD = 90;
                topD = 40;

            }
            else
            {
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topCN = 10;

                leftD = (SchematicWidth / 2) - (txtDescription.ActualWidth / 2);
                topD = 90;

            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtDescription.RenderTransform).X = leftD;
            ((TranslateTransform)txtDescription.RenderTransform).Y = topD;

        }

        public VoltageOutputDifferentialScreen(VoltageOutputDifferential vod) : base(vod)
        {
            Vod = vod;

            SymbolVoltmeter = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolVoltmeter"]
            };
            ComponentCanvas.Children.Add(SymbolVoltmeter);
            Canvas.SetTop(SymbolVoltmeter, 19);
            Canvas.SetLeft(SymbolVoltmeter, 19);


            txtComponentName = new TextBlock() { FontWeight = FontWeights.ExtraBold };
            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = Vod
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
                Source = Vod
            };
            txtDescription.SetBinding(TextBlock.TextProperty, b2);
            txtDescription.RenderTransform = new TranslateTransform() { };
            txtDescription.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };

          
            Children.Add(txtDescription);

            txtV = new TextBlock()
            {
                FontWeight = FontWeights.Bold,
                Text = "V",
                RenderTransform = new TranslateTransform()
            };
            ((TranslateTransform)txtV.RenderTransform).X = 55;
            ((TranslateTransform)txtV.RenderTransform).Y = 50;

            Children.Add(txtV);
            

            postConstruct();

        }
    }
}
