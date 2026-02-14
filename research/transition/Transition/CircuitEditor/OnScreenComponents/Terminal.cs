using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.Common;
using Windows.UI;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Shapes;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class ElementTerminal : Grid
    {
        public delegate void TerminalDelegate(ElementTerminal t);
        public event TerminalDelegate TerminalPositionChanged;

        public ScreenElementBase ScreenElement { get; }
        public byte TerminalNumber { get; }
        
        private Point2D terminalPosition;
        public Point2D TerminalPosition
        {
            get => terminalPosition;
            set
            {
                if (terminalPosition == value) return;

                terminalPosition = value;
                rectTransform.X = value.X - (rectangleWidth / 2);
                rectTransform.Y = value.Y - (rectangleWidth / 2);

                TerminalPositionChanged?.Invoke(this);
            }
        }
        
        

        private double rectangleWidth => 8;

        private Rectangle rectangle;
        private TranslateTransform rectTransform;

        public ElementTerminal(byte terminalNumber, ScreenElementBase element)
        {
            rectTransform = new TranslateTransform();

            this.HorizontalAlignment = HorizontalAlignment.Left;
            this.VerticalAlignment = VerticalAlignment.Top;

            rectangle = new Rectangle()
            {
                Width = rectangleWidth,
                Height = rectangleWidth,
                Stroke = new SolidColorBrush(Colors.Black),
                StrokeThickness = 1,
                Visibility = Visibility.Collapsed
            };
            
            this.TerminalNumber = terminalNumber;
            this.ScreenElement = element;
            this.RenderTransform = rectTransform;

            Children.Add(rectangle);
        }

        public void highlight()
        {
            rectangle.Visibility = Visibility.Visible;
        }

        public void lowlight()
        {
            rectangle.Visibility = Visibility.Collapsed;
        }

        public Point2D getAbsoluteTerminalPosition()
        {
            return ScreenElement.getAbsoluteTerminalPosition(TerminalNumber);
        }

        public override string ToString() => "Terminal " + TerminalNumber.ToString() + " of element " + ScreenElement.ToString();
    }

    public class WireTerminal : ElementTerminal , ICircuitSelectable, ICircuitMovable
    {
        public WireScreen WireScreen { get; }
        public bool isBounded => WireScreen.isTerminalBounded(TerminalNumber);
       //  public Point2D OriginalTerminalPosition => WireScreen.serializableWire.PositionTerminal(TerminalNumber);

        public Point2D OriginalTerminalPosition { get; set; }

        public WireTerminal(byte terminalNumber, WireScreen wireScreen) : base(terminalNumber, wireScreen)
        {
            this.WireScreen = wireScreen;
        }

        public void selected()
        {
            OriginalTerminalPosition = TerminalPosition;
            WireScreen.selected(TerminalNumber);
        }

        public void deselected()
        {
            WireScreen.deselected(TerminalNumber);
        }

        public void moveRelative(Point2D vector)
        {
            WireScreen.moveRelative(TerminalNumber, vector, OriginalTerminalPosition);
        }

        
        public void moveAbsolute(Point2D vector)
        {
            WireScreen.moveAbsolute(TerminalNumber, vector);
        }

        public bool isInside(Rectangle rect)
        {
            if (rect == null) return false;

            double x1 = Canvas.GetLeft(rect);
            double y1 = Canvas.GetTop(rect);
            double x2 = Canvas.GetLeft(rect) + rect.Width;
            double y2 = Canvas.GetTop(rect) + rect.Height;

            return ((x1 < TerminalPosition.X) && (x2 > TerminalPosition.X) &&
                    (y1 < TerminalPosition.Y) && (y2 > TerminalPosition.Y));
              
        }

        public bool isClicked(Point2D point)
        {
            return (point.getDistance(TerminalPosition) < WireScreen.RadiusClick);
        }

        public void moveRelativeCommand(Point2D vector)
        {
            WireScreen.serializableWire.moveTerminalRelative(TerminalNumber, vector);
        }
    }

}
