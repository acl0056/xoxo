using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Windows.Foundation;
using Windows.UI;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Shapes;

namespace Easycoustics.Transition.CircuitEditor.OnScreenComponents
{
    /* i had to use Grid class because it has a border
     as for Border class, it is sealed...*/

    public abstract class ScreenElementBase : Grid
    {
        public abstract void moveRelative(Point2D destination);
     
        public abstract void selected();
        public abstract void deselected();

        public abstract void highlightTerminal(byte terminal);
        public abstract void lowlightTerminal(byte terminal);
        public abstract void lowlightAllTerminals();

        public abstract SerializableElement Serializable { get; }

        public abstract double RadiusClick { get; }
        public abstract bool isClicked(Point2D point);

        public abstract bool isInside(Rectangle rect);
        public abstract Point2D getAbsoluteTerminalPosition(byte terminal);

        public abstract byte QuantityOfTerminals { get; }

        public abstract void SerializableLayoutChanged(SerializableElement el);

        public List<ElementTerminal> Terminals { get; } = new List<ElementTerminal>();

        public delegate void ScreenElementDelegate(ScreenElementBase el);
        public event ScreenElementDelegate ScreenLayoutChanged;
        
        public ScreenElementBase(SerializableElement element)
        {
            element.LayoutChanged += SerializableLayoutChanged;
           
        }

        public void RaiseScreenLayoutChanged()
        {
            ScreenLayoutChanged?.Invoke(this);
        }
        
    }




    public abstract class ScreenComponentBase : ScreenElementBase, INotifyPropertyChanged, ICircuitSelectable, ICircuitMovable
    {
        public Canvas ComponentCanvas { get; }
        protected CompositeTransform ComponentTransform { get; }

        public SerializableComponent SerializableComponent { get; }

        public override SerializableElement Serializable => SerializableComponent;

        public abstract int[,] TerminalPositions { get; }

        public abstract double SchematicWidth { get; }
        public abstract double SchematicHeight { get; }

        public double RotatedSchematicWidth { get {
                if (ActualRotation == 90 || ActualRotation == 270)
                    return SchematicHeight;
                else return SchematicWidth;
            } }

        public double RotatedSchematicHeight { get {
                if (ActualRotation == 90 || ActualRotation == 270)
                    return SchematicWidth;
                else return SchematicHeight;
            } }

        public Point2D HalfComponentVector =>
                     new Point2D(RotatedSchematicWidth / 2, RotatedSchematicHeight / 2);
             
        public abstract void setPositionTextBoxes(SerializableElement element);
   
        public double ActualRotation => SerializableComponent.Rotation;
        public bool FlipX => SerializableComponent.FlipX;
        public bool FlipY => SerializableComponent.FlipY;

        public Point2D componentPosition;
        public Point2D ComponentPosition
            { get => componentPosition;
              set  { if (componentPosition == value) return;
                     componentPosition = value;
                     setPositionTerminals(Serializable);
                     setPositionTextBoxes(Serializable);
                     RaiseScreenLayoutChanged();
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("ComponentPosition"));
            } }

        public Point2D OriginalComponentPosition => SerializableComponent.ComponentPosition;

        public override byte QuantityOfTerminals => SerializableComponent.QuantityOfTerminals;
        public override double RadiusClick => 30;

        public event PropertyChangedEventHandler PropertyChanged;
       
        public override void SerializableLayoutChanged(SerializableElement el)
        {
            ComponentPosition = SerializableComponent.ComponentPosition;
        }

        public ScreenComponentBase(SerializableComponent component) : base(component)
        {
            SerializableComponent = component;
        
            ComponentTransform = new CompositeTransform();
            ComponentTransform.CenterX = SchematicWidth / 2;
            ComponentTransform.CenterY = SchematicHeight / 2;


            ComponentCanvas = new Canvas()
            {
                IsTapEnabled = true,
                RenderTransform = ComponentTransform
            };

            Background = new SolidColorBrush(Colors.Transparent);
            BorderThickness = new Thickness(1);
            Children.Add(ComponentCanvas);
            ComponentCanvas.HorizontalAlignment = HorizontalAlignment.Left;
            ComponentCanvas.VerticalAlignment = VerticalAlignment.Top;

            Binding bPX = new Binding()
            {
                Path = new PropertyPath("ComponentPosition.X"),
                Mode = BindingMode.OneWay,
                Source = this
            };
            SetBinding(Canvas.LeftProperty, bPX);

            Binding bPY = new Binding()
            {
                Path = new PropertyPath("ComponentPosition.Y"),
                Mode = BindingMode.OneWay,
                Source = this
            };
            SetBinding(Canvas.TopProperty, bPY);

            Binding bRt = new Binding()
            {
                Path = new PropertyPath("ActualRotation"),
                Mode = BindingMode.OneWay,
                Source = this,
            };
            BindingOperations.SetBinding(ComponentTransform, CompositeTransform.RotationProperty, bRt);

            Binding bFX = new Binding()
            {
                Path = new PropertyPath("FlipX"),
                Mode = BindingMode.OneWay,
                Converter = new BoolToIntConverter(),
                Source = this
            };
            BindingOperations.SetBinding(ComponentTransform, CompositeTransform.ScaleXProperty, bFX);

            Binding bFY = new Binding()
            {
                Path = new PropertyPath("FlipY"),
                Mode = BindingMode.OneWay,
                Converter = new BoolToIntConverter(),
                Source = this
            };
            BindingOperations.SetBinding(ComponentTransform, CompositeTransform.ScaleYProperty, bFY);

            ElementTerminal t;

            for (byte x = 0; x < QuantityOfTerminals; x++)
            {
                t = new ElementTerminal(x, this);
                Terminals.Add(t);
                Children.Add(t);
            }
     
            SerializableComponent.LayoutChanged += SerializableComponent_LayoutChanged;

        }

        private void SerializableComponent_LayoutChanged(SerializableElement el)
        {
       
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("ActualRotation"));
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("FlipX"));
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs("FlipY"));

            double CorrectionDisplacement = (SchematicWidth - SchematicHeight) / 2;

            if (ActualRotation == 90 || ActualRotation == 270)
            {
                Width = SchematicHeight;
                Height = SchematicWidth;
                ComponentTransform.TranslateX = -1 * CorrectionDisplacement;
                ComponentTransform.TranslateY = CorrectionDisplacement;
            }
            else
            {
                Width = SchematicWidth;
                Height = SchematicHeight;
                ComponentTransform.TranslateX = 0;
                ComponentTransform.TranslateY = 0;
            }
            ComponentCanvas.Width = SchematicWidth;
            ComponentCanvas.Height = SchematicHeight;
            ComponentTransform.CenterX = SchematicWidth / 2;
            ComponentTransform.CenterY = SchematicHeight / 2;

            setPositionTextBoxes(SerializableComponent);
            setPositionTerminals(SerializableComponent);

        }

        protected void postConstruct()
        {
            Width = SchematicWidth;
            Height = SchematicHeight;
            SerializableComponent_LayoutChanged(Serializable);

        }


        public override bool isInside(Rectangle rect)
        {
            if (rect == null) return false;

            double x1 = Canvas.GetLeft(rect);
            double y1 = Canvas.GetTop(rect);
            double x2 = Canvas.GetLeft(rect) + rect.Width;
            double y2 = Canvas.GetTop(rect) + rect.Height;

            if ((x1 < (ComponentPosition.X + (SchematicWidth / 2))) &&
                (x2 > (ComponentPosition.X + (SchematicWidth / 2))) &&
                (y1 < (ComponentPosition.Y + (SchematicHeight / 2))) &&
                (y2 > (ComponentPosition.Y + (SchematicHeight / 2))))
                return true;
            else
                return false;
        }

        public bool isPointInsideComponent(Point2D point)
        {
            return (point.X > ComponentPosition.X) && (point.X < (ComponentPosition.X + SchematicWidth)) &&
                   (point.Y > ComponentPosition.Y) && (point.Y < (ComponentPosition.Y + SchematicHeight));
        }
        

        public override void selected()
        {
            BorderBrush = new SolidColorBrush(Colors.Black);
            BorderThickness = new Thickness(1);
        }
        
        public override void deselected()
        {
             BorderBrush = new SolidColorBrush(Colors.Transparent);
        }
        
        public override void moveRelative(Point2D displacement)
        {
            Point2D originalPosition = SerializableComponent.ComponentPosition;

            ComponentPosition = originalPosition + displacement;
        }

        public void moveAbsolute(Point2D newPosition)
        {
            ComponentPosition = newPosition;
        }
        
        public Point2D getRelativeTerminalPosition(byte terminal)
        {
            double radRotation = ( ActualRotation * Math.PI / 180);

            Point2D VectorFromCenter = new Point2D(
                (-1 * SchematicWidth / 2) + TerminalPositions[terminal, 0],
                (-1 * SchematicHeight / 2) + TerminalPositions[terminal, 1]);

            Point2D FlippedVector = VectorFromCenter;

            if (FlipX) FlippedVector = Point2D.NegateX(FlippedVector);
            if (FlipY) FlippedVector = Point2D.NegateY(FlippedVector);

            Point2D ShiftedVector = Point2D.AngleShift(FlippedVector, radRotation);
            
            return ShiftedVector;
          
        }

        public void setPositionTerminals(SerializableElement element)
        {
            for (byte x = 0; x < QuantityOfTerminals; x++)
                Terminals[x].TerminalPosition = HalfComponentVector + getRelativeTerminalPosition(x);
            
        }


        public override Point2D getAbsoluteTerminalPosition(byte terminal)
        {
            Point2D relative = getRelativeTerminalPosition(terminal);
            
            return relative + ComponentPosition + HalfComponentVector;
        }


        public override void highlightTerminal(byte terminal)
        {
            Terminals[terminal].highlight();
        }

        public override void lowlightAllTerminals()
        {
            for (byte i = 0; i < QuantityOfTerminals; i++)
                lowlightTerminal(i);
        }

        public override void lowlightTerminal(byte terminal)
        {
            Terminals[terminal].lowlight();
        }

        public override bool isClicked(Point2D point)
        {
            return point.getDistance(componentPosition + HalfComponentVector) < RadiusClick;
        }

        public void moveRelativeCommand(Point2D displacement)
        {
            SerializableComponent.ComponentPosition += displacement;
        }
    }



    public class BoolToIntConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            if (value == null) return 1;
            bool valueBool = (bool)value;

            return valueBool ? -1 : 1;
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            if (value == null) return false;
            int valueInt = (int)value;

            return !(valueInt == 1);
        }
    }
}
