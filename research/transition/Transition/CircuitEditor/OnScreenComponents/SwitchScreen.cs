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
    public class SwitchScreen : ScreenComponentBase
    {
        /* this one is pretty complicated, since its symbolic representation
         on screen can change dinamically */

        public override int[,] TerminalPositions
        { get {
                var output = new int[QuantityOfTerminals, 2];
                output[0, 0] = 20;
                output[0, 1] = 20;
                for (byte x = 1; x < QuantityOfTerminals; x++)
                {
                    output[x, 0] = 100;
                    output[x, 1] = 20 + ((x - 1) * 20);
                }
                return output;
            } }

        public override double SchematicWidth => 120;
        public override double SchematicHeight {
            get {
                int output = 20 + ((QuantityOfTerminals - 1) * 20);
                if ((output % 40) != 0)
                    output += 20;
                return output;
            } }

        private List<TextBlock> letters = new List<TextBlock>();
        private TextBlock txtComponentName { get; }

        private Line closeCircuitLine = new Line()
        {
            Stroke = new SolidColorBrush(Colors.Black),
            StrokeThickness = 4
        };
        private Line closeCircuitLine2 = new Line()
        {
            Stroke = new SolidColorBrush(Colors.Black),
            StrokeThickness = 4
        };


        public SwitchScreen(Switch sw) : base(sw)
        {
            sw.TerminalsChanged += TerminalsChanged;
            
            closeCircuitLine.X1 = 20;
            closeCircuitLine.Y1 = 20;

            Binding b1 = new Binding()
            {
                Path = new PropertyPath("ElementName"),
                Mode = BindingMode.OneWay,
                Source = sw
            };

            txtComponentName = new TextBlock()
            {
                FontWeight = FontWeights.ExtraBold,
                RenderTransform = new TranslateTransform()
            };
            txtComponentName.SetBinding(TextBlock.TextProperty, b1);
            txtComponentName.SizeChanged += delegate { setPositionTextBoxes(SerializableComponent); };
            Children.Add(txtComponentName);

            TerminalsChanged(sw.QuantityOfTerminals, sw.QuantityOfTerminals);

            postConstruct();
        }

        private void TerminalsChanged(byte oldValue, byte newValue)
        {
            ComponentCanvas.Children.Clear();
            ComponentCanvas.Children.Add(closeCircuitLine);
            ComponentCanvas.Children.Add(closeCircuitLine2);

            Ellipse el1 = new Ellipse()
            {
                Width = 6,
                Height = 6,
                StrokeThickness = 1,
                Fill = new SolidColorBrush(Colors.Black)
            };
            
            ComponentCanvas.Children.Add(el1);
            Canvas.SetLeft(el1, 17);
            Canvas.SetTop(el1, 17);
            
            Ellipse el2;

            double yy;

            for (byte x = 1; x < QuantityOfTerminals; x++)
            {
                el2 = new Ellipse()
                {
                    Width = 6,
                    Height = 6,
                    StrokeThickness = 1,
                    Fill = new SolidColorBrush(Colors.Black)
                };
                ComponentCanvas.Children.Add(el2);
                Canvas.SetLeft(el2, 97);
                yy = 17 + ((x - 1) * 20);
                Canvas.SetTop(el2, yy);
            }

            var delete = new List<TextBlock>();
            delete.AddRange(Children.OfType<TextBlock>());

            foreach (TextBlock tx in delete)
                Children.Remove(tx);

            for (byte x = 1; x < QuantityOfTerminals; x++)
                Children.Add(new TextBlock()
                {
                    Text = mapNumberLetters[x],
                    Tag = x,
                    RenderTransform = new TranslateTransform()
                });

            Children.Add(txtComponentName);

            if (newValue < oldValue)
            {
                ElementTerminal t;

                for (byte x = oldValue; x > newValue; x--)
                {
                    t = Terminals[x - 1];
                    Terminals.Remove(t);
                    Children.Remove(t);
                }
            }

            if (newValue > oldValue)
            {
                ElementTerminal t;

                for (byte x = oldValue; x < newValue; x++)
                {
                    t = new ElementTerminal(x, this);
                    Terminals.Add(t); Children.Add(t);
                }
            }

            postConstruct();
            setPositionTextBoxes(SerializableComponent);
        }

        public override void setPositionTextBoxes(SerializableElement element)
        {
            for (byte x = 1; x < QuantityOfTerminals; x++)
            {
                if (!FlipX && !FlipY && (ActualRotation == 0))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 105;
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = (x - 1) * 20;
                }
                if (FlipX && !FlipY && (ActualRotation == 0))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5;
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = (x - 1) * 20;
                }
                if (!FlipX && FlipY && (ActualRotation == 0))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 105;
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = (QuantityOfTerminals - x) * 20;
                }
                if (FlipX && FlipY && (ActualRotation == 0))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5;
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = (QuantityOfTerminals - x) * 20;
                }

                if (!FlipX && !FlipY && (ActualRotation == 90))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5 + ((QuantityOfTerminals - x) * 20);
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = 100;
                }
                if (FlipX && !FlipY && (ActualRotation == 90))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5 + ((QuantityOfTerminals - x) * 20);
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = 0;
                }
                if (!FlipX && FlipY && (ActualRotation == 90))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5 + (x * 20);
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = 100;
                }
                if (FlipX && FlipY && (ActualRotation == 90))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5 + (x * 20);
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = 0;
                }

                if (!FlipX && !FlipY && (ActualRotation == 180))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5;
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = (QuantityOfTerminals - x) * 20;
                }
                if (FlipX && !FlipY && (ActualRotation == 180))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 105;
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = (QuantityOfTerminals - x) * 20;
                }
                if (!FlipX && FlipY && (ActualRotation == 180))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5;
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = (x - 1) * 20;
                }
                if (FlipX && FlipY && (ActualRotation == 180))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 105;
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = (x - 1) * 20;
                }

                if (!FlipX && !FlipY && (ActualRotation == 270))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5 + (x * 20);
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = 0;
                }
                if (FlipX && !FlipY && (ActualRotation == 270))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5 + (x * 20);
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = 100;
                }
                if (!FlipX && FlipY && (ActualRotation == 270))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5 + ((QuantityOfTerminals - x) * 20);
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = 0;
                }
                if (FlipX && FlipY && (ActualRotation == 270))
                {
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).X = 5 + ((QuantityOfTerminals - x) * 20);
                    ((TranslateTransform)getTxtLetter(x).RenderTransform).Y = 100;
                }
            }

            var sswitch = (Switch)Serializable;
            if (sswitch.State == 0)
            {
                closeCircuitLine.X2 = 20; closeCircuitLine.Y2 = 20;
                closeCircuitLine2.Visibility = Visibility.Collapsed;
            }
            else
            {
                closeCircuitLine.X2 = 80;
                closeCircuitLine.Y2 = sswitch.State * 20;
                closeCircuitLine2.Visibility = Visibility.Visible;
                closeCircuitLine2.X1 = 80;
                closeCircuitLine2.Y1 = sswitch.State * 20;
                closeCircuitLine2.X2 = 90;
                closeCircuitLine2.Y2 = sswitch.State * 20;
            }

            double leftCN; double topCN;

            if ((ActualRotation == 0) || (ActualRotation == 180))
            {
                topCN = -20;
                leftCN = (SchematicWidth / 2) - (txtComponentName.ActualWidth / 2);
            }
            else
            {
                topCN = 60 - (txtComponentName.ActualHeight / 2);
                leftCN = 0 - (txtComponentName.ActualWidth);
            }

            ((TranslateTransform)txtComponentName.RenderTransform).X = leftCN;
            ((TranslateTransform)txtComponentName.RenderTransform).Y = topCN;
            
        }

        private TextBlock getTxtLetter(byte terminal)
        {
            foreach (TextBlock txt in Children.OfType<TextBlock>())
                if ((byte)txt.Tag == terminal) return txt;
            
            return null;
        }

        private Dictionary<byte, string> mapNumberLetters =
            new Dictionary<byte, string>() {
                {  1, "A" },
                {  2, "B" },
                {  3, "C" },
                {  4, "D" },
                {  5, "E" },
                {  6, "F" },
                {  7, "G" },
                {  8, "H" },
                {  9, "I" },
                { 10, "J" },
                { 11, "K" },
                { 12, "L" },
                { 13, "M" },
                { 14, "N" },
                { 15, "O" },
                { 16, "P" },
                { 17, "Q" },
                { 18, "R" },
                { 19, "S" },
                { 20, "T" },
                { 21, "U" },
                { 22, "V" },
                { 23, "W" },
                { 24, "X" },
                { 25, "Y" },
                { 26, "Z" },
            };
    }
}
