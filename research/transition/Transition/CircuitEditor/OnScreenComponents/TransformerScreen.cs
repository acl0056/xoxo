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

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class TransformerScreen : ScreenComponentBase
    {
        public override double SchematicWidth => 120;
        public override double SchematicHeight => 120;

        public TextBlock txtComponentName;
        public TextBlock txtTurnsRatio;
        public TextBlock txtPri;
        public TextBlock txtSec;

        public ContentControl SymbolTransformer { get; }

        public override int[,] TerminalPositions
        {
            get => new int[,] { { 20, 20 }, { 20, 100 }, { 100, 20 }, { 100, 100 } };
        }
        public TransformerScreen(Transformer trans) : base(trans)
        {
            SymbolTransformer = new ContentControl()
            {
                ContentTemplate = (DataTemplate)Application.Current.Resources["symbolTransformer"]
            };
            ComponentCanvas.Children.Add(SymbolTransformer);
            Canvas.SetTop(SymbolTransformer, 19);
            Canvas.SetLeft(SymbolTransformer, 19);
            
            txtComponentName = new TextBlock() { FontWeight = FontWeights.ExtraBold };

            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = trans
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.RenderTransform = new TranslateTransform() { };
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);
            
            txtTurnsRatio = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };

            Binding b2 = new Binding()
            {
                Path = new PropertyPath("TurnsRatio"),
                Converter = new DecimalEngrConverter()
                    { ShortString = false, AllowNegativeNumber = false },
                Mode = BindingMode.OneWay,
                Source = trans,
            };
            txtTurnsRatio.SetBinding(TextBlock.TextProperty, b2);
            txtTurnsRatio.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtTurnsRatio);

            txtPri = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                Text = "Pri",
                RenderTransform = new TranslateTransform()
            };
            Children.Add(txtPri);

            txtSec = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                Text = "Sec",
                RenderTransform = new TranslateTransform()
            };
            Children.Add(txtSec);

            postConstruct();

        }

        public override void setPositionTextBoxes(SerializableElement el)
        {

            double leftTR; double topTR;
            double leftCN; double topCN;
            double leftPri; double topPri;
            double leftSec; double topSec;

            if (ActualRotation == 0)
            {
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topCN = -20;
                leftTR = (SchematicWidth / 2) - (txtTurnsRatio.ActualWidth / 2);
                topTR = 0;

                topPri = (SchematicHeight / 2) - (txtPri.ActualHeight / 2);
                topSec = (SchematicHeight / 2) - (txtSec.ActualHeight / 2);

                if (!FlipX)
                {
                    leftPri = 0;
                    leftSec = 100;
                }
                else
                {
                    leftPri = 100;
                    leftSec = 0;
                }

            }
            else if (ActualRotation == 90)
            {
                leftCN = (-1 * txtComponentName.ActualWidth) + 20;
                topCN = (SchematicHeight / 2) - (txtComponentName.ActualHeight / 2);
                leftTR = 100;
                topTR = (SchematicHeight / 2) - (txtTurnsRatio.ActualHeight / 2);

                leftPri = (SchematicWidth / 2) - (txtPri.ActualWidth / 2);
                leftSec = (SchematicWidth / 2) - (txtSec.ActualWidth / 2);

                if (!FlipX)
                {
                    topPri = 0;
                    topSec = 100;
                }
                else
                {
                    topPri = 100;
                    topSec = 0;
                }
            }
            else if (ActualRotation == 180)
            {
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
                topCN = -20;
                leftTR = (SchematicWidth / 2) - (txtTurnsRatio.ActualWidth / 2);
                topTR = 0;

                topPri = (SchematicHeight / 2) - (txtPri.ActualHeight / 2);
                topSec = (SchematicHeight / 2) - (txtSec.ActualHeight / 2);

                if (!FlipX)
                {
                    leftPri = 100;
                    leftSec = 0;
                }
                else
                {
                    leftPri = 0;
                    leftSec = 100;
                }

            }
            else
            {
                leftCN = (-1 * txtComponentName.ActualWidth) + 20;
                topCN = (SchematicHeight / 2) - (txtComponentName.ActualHeight / 2);
                leftTR = 100;
                topTR = (SchematicHeight / 2) - (txtTurnsRatio.ActualHeight / 2);

                leftPri = (SchematicWidth / 2) - (txtPri.ActualWidth / 2);
                leftSec = (SchematicWidth / 2) - (txtSec.ActualWidth / 2);

                if (!FlipX)
                {
                    topPri = 100;
                    topSec = 0;
                }
                else
                {
                    topPri = 0;
                    topSec = 100;
                }
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;

            ((TranslateTransform)txtTurnsRatio.RenderTransform).X = leftTR;
            ((TranslateTransform)txtTurnsRatio.RenderTransform).Y = topTR;

            ((TranslateTransform)txtPri.RenderTransform).X = leftPri;
            ((TranslateTransform)txtPri.RenderTransform).Y = topPri;

            ((TranslateTransform)txtSec.RenderTransform).X = leftSec;
            ((TranslateTransform)txtSec.RenderTransform).Y = topSec;

        }
    }
}
