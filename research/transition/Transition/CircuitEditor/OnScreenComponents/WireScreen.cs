using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Windows.UI;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Shapes;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    public class WireScreen : ScreenElementBase, INotifyPropertyChanged, ICircuitSelectable
    {
        private Line line { get; }

        public SerializableWire serializableWire;

        Binding bX0;
        Binding bY0;
        Binding bX1;
        Binding bY1;

        private Point2D position0;
        public Point2D PositionTerminal0
        {
            get { return position0; }
            set
            {
                position0 = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("PositionTerminal0"));
                RaiseScreenLayoutChanged();
                if (Terminals!=null) Terminals[0].TerminalPosition = value;
            }
        }
        
        private Point2D position1;
        public Point2D PositionTerminal1
        {
            get { return position1; }
            set
            {
                position1 = value;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("PositionTerminal1"));
                RaiseScreenLayoutChanged();
                if (Terminals != null) Terminals[1].TerminalPosition = value;
            }
        }


        public Tuple<ScreenElementBase, byte> bind0
        {
            get
            {
                if (serializableWire.Bind0 != null)
                    return new Tuple<ScreenElementBase, byte>
                        (serializableWire.Bind0.Item1.OnScreenElement,
                         serializableWire.Bind0.Item2);
                else return null;
            }
        }

        public Tuple<ScreenElementBase, byte> bind1
        {
            get
            {
                if (serializableWire.Bind1 != null)
                    return new Tuple<ScreenElementBase, byte>
                        (serializableWire.Bind1.Item1.OnScreenElement,
                         serializableWire.Bind1.Item2);
                else return null;
            }
        }

        public Tuple<ScreenElementBase, byte> bind(byte terminalNumber) => (terminalNumber == 0) ? bind0 : bind1;

        public event PropertyChangedEventHandler PropertyChanged;

        public bool IsTerminal0Bounded => serializableWire.IsTerminal0Bounded;
        public bool IsTerminal1Bounded => serializableWire.IsTerminal1Bounded;
        public bool AreBothTerminalsFree => !IsTerminal0Bounded && !IsTerminal1Bounded;

        public override SerializableElement Serializable => serializableWire;

        public override double RadiusClick => 15;

        public override byte QuantityOfTerminals => 2;

        public override string ToString() => "WireScreen " + serializableWire.ToString();
        public WireScreen(SerializableWire wire) : base(wire)
        {
            this.serializableWire = wire;

            this.HorizontalAlignment = HorizontalAlignment.Left;
            this.VerticalAlignment = VerticalAlignment.Top;

            line = new Line()
            {
                StrokeThickness = 4,
                Stroke = new SolidColorBrush(Colors.Black),
                StrokeEndLineCap = PenLineCap.Round,
                StrokeStartLineCap = PenLineCap.Round
            };
           
            bX0 = new Binding()
            {
                Path = new PropertyPath("PositionTerminal0.X"),
                Mode = BindingMode.OneWay,
                Source = this
            };
            line.SetBinding(Line.X1Property, bX0);

            bY0 = new Binding()
            {
                Path = new PropertyPath("PositionTerminal0.Y"),
                Mode = BindingMode.OneWay,
                Source = this
            };
            line.SetBinding(Line.Y1Property, bY0);

            bX1 = new Binding()
            {
                Path = new PropertyPath("PositionTerminal1.X"),
                Mode = BindingMode.OneWay,
                Source = this
            };
            line.SetBinding(Line.X2Property, bX1);

            bY1 = new Binding()
            {
                Path = new PropertyPath("PositionTerminal1.Y"),
                Mode = BindingMode.OneWay,
                Source = this
            };
            line.SetBinding(Line.Y2Property, bY1);
            
            wire.WireBindingChanged += updateBinding;
            Children.Add(line);

            var terminal0 = new WireTerminal(0, this) { TerminalPosition = serializableWire.PositionTerminal0 };
            var terminal1 = new WireTerminal(1, this) { TerminalPosition = serializableWire.PositionTerminal1 };

            Terminals.Add(terminal0);
            Terminals.Add(terminal1);

            Children.Add(terminal0);
            Children.Add(terminal1);
            
        }

        public WireTerminal getWireTerminal(byte terminal)
        {
            return (terminal == 0) ? Terminals[0] as WireTerminal : 
                                     Terminals[1] as WireTerminal;
        }

        private void updateBinding(SerializableWire wire, byte terminal, Tuple<SerializableElement, byte> previousValue, Tuple<SerializableElement, byte> newValue)
        {
            if (previousValue != null)
                previousValue.Item1.OnScreenElement.ScreenLayoutChanged -= updateScreenLayoutForBinded;
            
            if (newValue != null)
                newValue.Item1.OnScreenElement.ScreenLayoutChanged += updateScreenLayoutForBinded;
        }

        private void updateScreenLayoutForBinded(ScreenElementBase el)
        {
            if (IsTerminal0Bounded)
                if (bind0.Item1 == el)
                {
                    PositionTerminal0 = el.getAbsoluteTerminalPosition(bind0.Item2);
                    serializableWire.PositionTerminal0 = PositionTerminal0; /* here we also
                    update the serializable (which is the hard authority), this assignment does not
                    impact directly on the UI because the wireterminal is binded
                    and its position is dictated by other object
                    , but it is useful to keep the hard position following the other terminal position
                    , so in the case the other object is deleted, the bind is erased, 
                    and this wire terminal is free and recovers its autonomy, 
                    so the wire terminal is left free but it remains in place , and not change
                    position abruptely because the hard position in serializable object can be
                    somewhere else very distant.*/
                }

            if (IsTerminal1Bounded)
                if (bind1.Item1 == el)
                { PositionTerminal1 = el.getAbsoluteTerminalPosition(bind1.Item2);
                    serializableWire.PositionTerminal1 = PositionTerminal1;
                }
        }
        

        public override void selected()
        {
            highlightTerminal(0);
            highlightTerminal(1);
        }

        public override void deselected()
        {
            lowlightTerminal(0);
            lowlightTerminal(1);
        }

        public void selected(byte terminal)
        {
            highlightTerminal(terminal);
        }

        public void deselected(byte terminal)
        {
            lowlightTerminal(terminal);
        }

        public override void highlightTerminal(byte terminal)
        {
            Terminals[terminal].highlight();
        }

        public override void lowlightTerminal(byte terminal)
        {
            Terminals[terminal].lowlight();
        }

        public override void lowlightAllTerminals()
        {
            lowlightTerminal(0);
            lowlightTerminal(1);
        }

        public override bool isInside(Rectangle rect)
        {
            if (rect == null) return false;

            double x1 = Canvas.GetLeft(rect);
            double y1 = Canvas.GetTop(rect);
            double x2 = Canvas.GetLeft(rect) + rect.Width;
            double y2 = Canvas.GetTop(rect) + rect.Height;

            double leftExtreme =   (PositionTerminal0.X < PositionTerminal1.X) ? PositionTerminal0.X : PositionTerminal1.X;
            double rightExtreme =  (PositionTerminal0.X > PositionTerminal1.X) ? PositionTerminal0.X : PositionTerminal1.X;
            double topExtreme =    (PositionTerminal0.Y < PositionTerminal1.Y) ? PositionTerminal0.Y : PositionTerminal1.Y;
            double bottomExtreme = (PositionTerminal0.Y > PositionTerminal1.Y) ? PositionTerminal0.Y : PositionTerminal1.Y;

            return (x1 < leftExtreme) && (x2 > rightExtreme) &&
                   (y1 < topExtreme) && (y2 > bottomExtreme);
        }

        public override Point2D getAbsoluteTerminalPosition(byte terminal)
        {
            return (terminal == 0) ? PositionTerminal0 : PositionTerminal1;
        }

        public override void SerializableLayoutChanged(SerializableElement el)
        {
            if (!IsTerminal0Bounded)
            {
                PositionTerminal0 = serializableWire.PositionTerminal0;
                ((WireTerminal)Terminals[0]).OriginalTerminalPosition = PositionTerminal0;
            }
            else
                updateScreenLayoutForBinded(bind0.Item1);

            if (!IsTerminal1Bounded)
            {
                PositionTerminal1 = serializableWire.PositionTerminal1;
                ((WireTerminal)Terminals[1]).OriginalTerminalPosition = PositionTerminal1;
            }
            else
                updateScreenLayoutForBinded(bind1.Item1);


        }

        public override void moveRelative(Point2D vector)
        {
            Point2D originalPositionTerminal0 = serializableWire.PositionTerminal0;
            Point2D originalPositionTerminal1 = serializableWire.PositionTerminal1;

            PositionTerminal0 = originalPositionTerminal0 + vector;
            PositionTerminal1 = originalPositionTerminal1 + vector;
        }

        public void moveRelative(byte terminalNumber, Point2D vector, Point2D originalPositionTerminal)
        {
         
            if (terminalNumber == 0)
                PositionTerminal0 = originalPositionTerminal + vector;
            else
                PositionTerminal1 = originalPositionTerminal + vector;
        }

        public void moveAbsolute(byte terminal, Point2D point)
        {
            if (terminal == 0)
                PositionTerminal0 = point;
            else
                PositionTerminal1 = point;
        }

        public bool isTerminalBounded(byte terminal)
        {
            return (terminal == 0) ? IsTerminal0Bounded : IsTerminal1Bounded;
        }

        public override bool isClicked(Point2D point)
        {
            double wireLength = PositionTerminal0.getDistance(PositionTerminal1);
            double stepLength = RadiusClick / 2;
            double quantityOfSteps = wireLength / stepLength;

            Point2D stepVector = new Point2D((PositionTerminal1 - PositionTerminal0).X / quantityOfSteps,
                                             (PositionTerminal1 - PositionTerminal0).Y / quantityOfSteps);

            Point2D currentPoint = PositionTerminal0 + stepVector;

            for (int i = 0; i < (quantityOfSteps - 1); i++)
            {
                if (currentPoint.getDistance(point) < RadiusClick) return true;
                currentPoint += stepVector;
            }

            return false;
        }
    }
}
