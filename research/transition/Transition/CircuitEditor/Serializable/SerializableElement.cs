using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.Common;
using Windows.UI.Xaml.Controls;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public enum Precision { Arbitrary, p05, p1, p2, p5, p10, p20, p50 }

    /* Element is something that has terminals 
       An element can be 1) wire or 2) component
       component are things that performs a function in a circuit
       things like resistors, opamps, transformers, etc */
       /* wires and components are very different in their UI operation
        but they share a few properties , the two types have terminals */


    public abstract class SerializableElement : BindableBase
    {
        private string elementName = "";
        public string ElementName
        {
            get { return elementName; }
            set { SetProperty(ref elementName, value);
                raiseLayoutChanged();
            }
        }

        public abstract string ElementLetter { get; }   /* "R" for resistor, "L" for inductor etc.. */
        public abstract string ElementType { get; }     /* Resistor, Wire, etc..*/

        /* QuantityOfTerminals is a get; set; 
         * because it can be modified at runtime,
         * some components can change their terminals at runtime,
           those are Transducer, Switch, Potentiometer and Summer */
        public abstract byte QuantityOfTerminals { get; set; }

        public Dictionary<byte, List<SerializableWire>> AttachedWires { get; } = new Dictionary<byte, List<SerializableWire>>();

        // OnScreenComponent is the class that has responsability
        // for showing the component on screen of the CircuitEditor
        // it manages position of textboxes like component values, names
        // or other parameters.
        // it is a Canvas that must be added to the canvas of CircuitEditor
        public ScreenElementBase OnScreenElement { get; set; }

        public delegate void EmptyDelegate();
        public event ElementDelegate ElementDeleted;

        public delegate void ElementDelegate(SerializableElement el);
        public event ElementDelegate LayoutChanged;

        public delegate void ElementTerminal(SerializableElement el, byte terminalNumber);
        public event ElementTerminal ElementTerminalDeleted;
        
        public virtual void SetProperty(string property, object value)
        {
            switch (property)
            {
                case "ElementName": ElementName = (string)value; break;
            }
        }

        public void deletedElement()
        {
            ElementDeleted?.Invoke(this);
        }

        public void raiseLayoutChanged()
        {
            LayoutChanged?.Invoke(this);
        }

        public void raiseTerminalDeleted(byte terminal)
        {
            ElementTerminalDeleted?.Invoke(this, terminal);
        }

        public override string ToString()
        {
            return "Element: " + ElementName;
        }

        public void PutAttachedWire(byte thisElementTerminal, SerializableWire wire)
        {
            if (!AttachedWires.Keys.Contains(thisElementTerminal))
                AttachedWires[thisElementTerminal] = new List<SerializableWire>();

            if (!AttachedWires[thisElementTerminal].Contains(wire))
                AttachedWires[thisElementTerminal].Add(wire);
        }
    }




    /* these SerializableComponent object are the instances that have the responsability
     * of storing the components information, they do not perform nothing but that
     * , to store the component data, and to save the integrity of that information.
     * the purpose of this class is to serialize and deserialize it, so it can be
     * saved on design file.
     * Also is to be said, SerializableElements are the instances stored in the
     * Component collection, of the UserDesign class.
     * On the other hand. There are two classes that have the responsability to show the component
     * data on screen, 1) Screen and 2) ParametersControl, these two classes query
     * the data stored in SerializableElement directly.
     * Screen class shows the component data in the electric circuit canvas
     * ParametersControl allows to user to input data, and stores the data
     * in SerializableElement.
     * as soon a SerializableComponent object is created, the Screen and ParametersControl
     * instances are created, and tied up to the original Serializable object.
     * so the three clases are strongly coupled together.
     * All data changes must be done via Command objects, so these changes can be
     * undone via undo & redo functionality. (This is called commanding pattern,
     * using the Undo & Redo stacks)

        */

    public abstract class SerializableComponent : SerializableElement
    {
        /* Rotation, FlipX, FlipY and ComponentPosition are UI parameters */
        private double rotation;
        public double Rotation { get { return rotation; }
            set {
                double correctedValue = value;

                while ((correctedValue < 0) || (correctedValue >= 360))
                {
                    if (correctedValue < 0) correctedValue += 360;
                    if (correctedValue >= 360) correctedValue -= 360;
                }

                SetProperty(ref rotation, correctedValue);
                raiseLayoutChanged();
            } }

        private bool flipX;
        public bool FlipX { get { return flipX; }
            set { SetProperty(ref flipX, value);
                raiseLayoutChanged();
            } }

        private bool flipY;
        public bool FlipY { get { return flipY; }
            set { SetProperty(ref flipY, value);
                raiseLayoutChanged();
            } }

        private Point2D componentPosition;
        public Point2D ComponentPosition
        {
            get { return componentPosition; }
            set
            {
                SetProperty(ref componentPosition, value);
                raiseLayoutChanged();
            }
        }

        // ParametersControl is the UI Control that allows user to
        // configure the component parameters
        public UserControl ParametersControl { get; set; }


        public List<byte> GetOtherTerminals(byte terminal)
        {
            var output = new List<byte>();

            for (byte x = 0; x < QuantityOfTerminals; x++)
                if (x != terminal) output.Add(x);

            return output;
        }

        public abstract ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency);

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "Rotation":  Rotation = (double)value; break;
                case "FlipX":     FlipX = (bool)value; break;
                case "FlipY":     FlipY = (bool)value; break;
                case "Position":  ComponentPosition = (Point2D)value; break;
                case "QuantityOfTerminals":
                                  QuantityOfTerminals = (byte)value; break;
            }
        }

        public bool IsTerminalGrounded(byte terminal) {
                return GetOtherConnectedComponents(terminal).Select(tup => tup.Item1).Where(comp => comp is Ground).Count() > 0;
            } 
        

        public List<Tuple<SerializableComponent, byte>> GetOtherConnectedComponents(byte terminal)
        {
             /* the way to traverse a graph is with a recursive and with feedback, algorithm */

            var output = new List<Tuple<SerializableComponent, byte>>();

            var visitedWires = new List<SerializableWire>();

            Action<SerializableWire> visit = null;

            visit = (wire) =>
            {
                visitedWires.Add(wire);
                foreach (var item in wire.GetBoundedComponents)
                    if (!output.Contains(item)) output.Add(item);
            
                foreach (var nextWire in wire.GetBoundedWires)
                     if (!visitedWires.Contains(nextWire)) visit(nextWire);
            };

            if (AttachedWires.ContainsKey(terminal))
            {
                foreach (var wire in AttachedWires[terminal])
                    visit(wire);
            }

            if (!output.Contains(new Tuple<SerializableComponent, byte>(this, terminal)))
                output.Add(new Tuple<SerializableComponent, byte>(this, terminal));

            return output;
            
        }

        

    }
}
