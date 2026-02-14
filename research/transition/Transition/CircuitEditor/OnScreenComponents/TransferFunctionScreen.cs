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
    public class TransferFunctionScreen : ScreenComponentBase
    {
        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 40 }, { 20, 120 }, { 140, 40 }, { 140, 120 } };
        }

        public override double SchematicWidth => 160;
        public override double SchematicHeight => 160;

        private TextBlock TxtComponentName { get; }
        private TextBlock TxtTF { get; }
        
        public ContentControl SymbolTF { get; }
        
        public TransferFunctionScreen(TransferFunctionComponent tf) : base(tf)
        {
            SymbolTF = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolTF"]
            };

            ComponentCanvas.Children.Add(SymbolTF);
            Canvas.SetTop(SymbolTF, 19);
            Canvas.SetLeft(SymbolTF, 19);

            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = tf
            };

            TxtComponentName = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };
            TxtComponentName.SetBinding(TextBlock.TextProperty, b1);
            TxtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(TxtComponentName);

            TxtTF = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            Binding b2 = new Binding()
            {
                Path = new PropertyPath("TFString"),
                Mode = BindingMode.OneWay,
                Source = tf
            };
            TxtTF.SetBinding(TextBlock.TextProperty, b2);
            TxtTF.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(TxtTF);

            postConstruct();
        }

        public override void setPositionTextBoxes(SerializableElement element)
        {
            double leftCN; double topCN;
            double leftTF; double topTF;

            if (ActualRotation == 0)
            {
                leftCN = (SchematicWidth / 2) - (TxtComponentName.ActualWidth / 2);
                topCN = 00;

                leftTF = (SchematicWidth / 2) - (TxtTF.ActualWidth / 2);
                topTF = 60;
            }
            else if (ActualRotation == 90)
            {
                leftCN = (SchematicHeight / 2) - (TxtComponentName.ActualWidth / 2);
                topCN = 00;

                leftTF = (SchematicHeight / 2) - (TxtTF.ActualWidth / 2);
                topTF = 60;

            }
            else if (ActualRotation == 180)
            {
                leftCN = (SchematicWidth / 2) - (TxtComponentName.ActualWidth / 2);
                topCN = 00;

                leftTF = (SchematicWidth / 2) - (TxtTF.ActualWidth / 2);
                topTF = 60;
            }
            else
            {
                leftCN = (SchematicHeight / 2) - (TxtComponentName.ActualWidth / 2);
                topCN = 00;

                leftTF = (SchematicHeight / 2) - (TxtTF.ActualWidth / 2);
                topTF = 60;
            }

            ((TranslateTransform)TxtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)TxtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)TxtTF.RenderTransform).X = leftTF;
            ((TranslateTransform)TxtTF.RenderTransform).Y = topTF;
        }
    }
}
