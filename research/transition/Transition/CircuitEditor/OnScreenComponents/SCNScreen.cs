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
    public class SCNScreen : ScreenComponentBase
    {
        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 40 }, { 100, 40 } };
        }

        public override double SchematicWidth => 120;
        public override double SchematicHeight => 80;

        public ContentControl SymbolSCN { get; }

        public TextBlock txtComponentName;
        public TextBlock txtPolarityValue;
        public TextBlock txtResistanceValue;

        public SCNScreen(SCN scn) : base(scn)
        {
            SymbolSCN = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolSCN"]
            };

            ComponentCanvas.Children.Add(SymbolSCN);
            Canvas.SetTop(SymbolSCN, 19);
            Canvas.SetLeft(SymbolSCN, 19);

            var b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = scn
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

            var b2 = new Binding()
            {
                Path = new PropertyPath("ResistanceString"),
                Mode = BindingMode.OneWay,
                Source = scn
            };
            txtResistanceValue.SetBinding(TextBlock.TextProperty, b2);
            txtResistanceValue.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtResistanceValue);





            txtPolarityValue = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            var b3 = new Binding()
            {
                Path = new PropertyPath("PolarityString"),
                Mode = BindingMode.OneWay,
                Source = scn
            };
            txtPolarityValue.SetBinding(TextBlock.TextProperty, b3);
            txtPolarityValue.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtPolarityValue);

            postConstruct();
        }

        public override void setPositionTextBoxes(SerializableElement element)
        {
            double leftRV; double topRV;
            double leftCN; double topCN;
            double leftPV; double topPV;

            if ((ActualRotation == 0) || (ActualRotation == 180))
            {
                topCN = 0;
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topRV = 60;
                leftRV = (SchematicWidth / 2) - (txtResistanceValue.ActualWidth / 2);
                topPV = 30;
                leftPV = (SchematicWidth / 2) - (txtPolarityValue.ActualWidth / 2);

            }
            else
            {
                topCN = 60 - (txtComponentName.ActualHeight / 2);
                leftCN = 20 - (txtComponentName.ActualWidth);
                topRV = 60 - (txtResistanceValue.ActualHeight / 2);
                leftRV = SchematicHeight - 20;
                topPV = 40 - (txtPolarityValue.ActualHeight / 2);
                leftPV = SchematicHeight - 20;
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtResistanceValue.RenderTransform).X = leftRV;
            ((TranslateTransform)txtResistanceValue.RenderTransform).Y = topRV;

            ((TranslateTransform)txtPolarityValue.RenderTransform).X = leftPV;
            ((TranslateTransform)txtPolarityValue.RenderTransform).Y = topPV;
        }
    }
}
