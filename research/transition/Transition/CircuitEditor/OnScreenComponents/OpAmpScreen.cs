using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Shapes;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class OpAmpScreen : ScreenComponentBase
    {
        public TextBlock txtComponentName;
        public TextBlock txtModelName;

        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 60 }, { 20, 140 }, { 140, 100 } };
        }

        public override double SchematicWidth => 160;
        public override double SchematicHeight => 200;

        public ContentControl SymbolOpAmp { get; }
        
        public OpAmpScreen(OpAmp opamp) : base(opamp)
        {

            SymbolOpAmp = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolOpAmp"]
            };

            ComponentCanvas.Children.Add(SymbolOpAmp);
            Canvas.SetTop(SymbolOpAmp, 19);
            Canvas.SetLeft(SymbolOpAmp, 19);

            txtComponentName = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform(),
            };

            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = opamp
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);
            
            txtModelName = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform(),
                FontSize = 12
            };

            Binding b2 = new Binding()
            {
                Path = new PropertyPath("ModelName"),
                Mode = BindingMode.OneWay,
                Source = opamp
            };
            txtModelName.SetBinding(TextBlock.TextProperty, b2);
            txtModelName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtModelName);

            postConstruct();
        }

        public override void setPositionTextBoxes(SerializableElement opamp)
        {

            double leftCN; double topCN;
            double leftMN; double topMN;

            if (ActualRotation == 0)
            {
               
                topCN = 20;

                leftMN = 55;
                topMN = 90;

                if (!FlipX)
                    leftCN = 80;
                else
                    leftCN = 80 - txtComponentName.ActualWidth;
            }
            else if (ActualRotation == 90)
            {
                leftCN = 120;
                
                leftMN = (SchematicHeight / 2) - (txtModelName.ActualWidth / 2);
                topMN = 70;

                if (!FlipX)
                    topCN = 140;
                else
                    topCN = 40;
            }
            else if (ActualRotation == 180)
            {
                topCN = 20;

                leftMN = 55;
                topMN = 90;

                if (!FlipX)
                    leftCN = 80 - txtComponentName.ActualWidth;
                else
                    leftCN = 80;
            }
            else
            {
                leftCN = 120;

                leftMN = (SchematicHeight / 2) - (txtModelName.ActualWidth / 2);
                topMN = 70;

                if (!FlipX)
                    topCN = 40;
                else
                    topCN = 140;
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtModelName.RenderTransform).X = leftMN;
            ((TranslateTransform)txtModelName.RenderTransform).Y = topMN;
        }
    }
}
