using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class SerializableWire : SerializableElement
    {
        private Point2D positionTerminal0;
        public Point2D PositionTerminal0
        {
            get { return positionTerminal0; }
            set { if (positionTerminal0 == value) return;
                SetProperty(ref positionTerminal0, value);
                if (!IsTerminal0Bounded) raiseLayoutChanged();
            }
        }

        private Point2D positionTerminal1;
        public Point2D PositionTerminal1
        {
            get { return positionTerminal1; }
            set { if (positionTerminal1 == value) return;
                SetProperty(ref positionTerminal1, value);
                if (!IsTerminal1Bounded) raiseLayoutChanged();
            }
        }

        public Point2D PositionTerminal(byte terminal) => (terminal == 0) ? PositionTerminal0 : PositionTerminal1;

        public override string ElementLetter => "W";
        public override string ElementType => "Wire";

        public override byte QuantityOfTerminals { get => 2; set => throw new NotImplementedException(); }

        private Tuple<SerializableElement, byte> bind0;
        public Tuple<SerializableElement, byte> Bind0
        {
            get { return bind0; }
            set { Tuple<SerializableElement, byte> previousValue = bind0;
                SetProperty(ref bind0, value);
                ChangeBinding(0, previousValue, value);
                raiseLayoutChanged();
            }
        }

        private Tuple<SerializableElement, byte> bind1;
        public Tuple<SerializableElement, byte> Bind1
        {
            get { return bind1; }
            set { Tuple<SerializableElement, byte> previousValue = bind1;
                SetProperty(ref bind1, value);
                ChangeBinding(1, previousValue, value);
                raiseLayoutChanged();
            }
        }

        public bool IsTerminal0Bounded => Bind0 != null;
        public bool IsTerminal1Bounded => Bind1 != null;

        public bool IsOtherWireBoundedAtTerminal0 => IsTerminal0Bounded ? (Bind0.Item1 is SerializableWire) : false;
        public bool IsOtherWireBoundedAtTerminal1 => IsTerminal1Bounded ? (Bind1.Item1 is SerializableWire) : false;

        public bool IsComponentBoundedAtTerminal0 => IsTerminal0Bounded ? (Bind0.Item1 is SerializableComponent) : false;
        public bool IsComponentBoundedAtTerminal1 => IsTerminal1Bounded ? (Bind1.Item1 is SerializableComponent) : false;
        
        public bool IsWireGroundedAtTerminal0 { get { if (Bind0 != null) return Bind0.Item1 is Ground; else return false; } }
        public bool IsWireGroundedAtTerminal1 { get { if (Bind1 != null) return Bind1.Item1 is Ground; else return false; } }

        public bool IsWireGrounded => IsWireGroundedAtTerminal0 || IsWireGroundedAtTerminal1; 

        public bool IsIndependent => (!IsOtherWireBoundedAtTerminal0 && !IsOtherWireBoundedAtTerminal1);

        public delegate void WireBindDelegate(SerializableWire wire, byte terminal, 
                                              Tuple<SerializableElement, byte> previousValue,
                                              Tuple<SerializableElement, byte> newValue);
        public event WireBindDelegate WireBindingChanged;

        public List<Tuple<SerializableComponent, byte>> GetBoundedComponents
        {
            get
            {
                var output = new List<Tuple<SerializableComponent, byte>>();

                if (IsTerminal0Bounded)
                    if (bind0.Item1 is SerializableComponent)
                        output.Add(new Tuple<SerializableComponent, byte>
                            ((SerializableComponent)Bind0.Item1, Bind0.Item2));

                if (IsTerminal1Bounded)
                    if (bind1.Item1 is SerializableComponent)
                        output.Add(new Tuple<SerializableComponent, byte>
                            ((SerializableComponent)Bind1.Item1, Bind1.Item2));

                return output;
            }
        }

        public List<SerializableWire> GetBoundedWires
        {
            get
            {
                var output = new List<SerializableWire>();

                if (AttachedWires.ContainsKey(0))
                foreach (var wire in AttachedWires[0])
                    output.Add(wire);

                if (AttachedWires.ContainsKey(1))
                    foreach (var wire in AttachedWires[1])
                    output.Add(wire);


                if (IsOtherWireBoundedAtTerminal0)
                    output.Add((SerializableWire)Bind0.Item1);
                
                if (IsOtherWireBoundedAtTerminal1)
                    output.Add((SerializableWire)Bind1.Item1);

                if (IsTerminal0Bounded)
                {
                    var otherWires = Bind0.Item1.AttachedWires[Bind0.Item2];
                    if (otherWires != null) output.AddRange(otherWires);
                }

                if (IsTerminal1Bounded)
                {
                    var otherWires = Bind1.Item1.AttachedWires[Bind1.Item2];
                    if (otherWires != null) output.AddRange(otherWires);
                }



                return output;
            }
        }

        public WireScreen OnScreenWire { get; }
        
        public delegate void ComponentLayoutChanged();

        public SerializableWire()
        {
            OnScreenWire = new WireScreen(this);
            OnScreenElement = OnScreenWire;
        }

        public Tuple<SerializableElement, byte> bnd(byte terminal)
        {
            return (terminal == 0) ? bind0 : bind1;
        }

        public void ChangeBinding(byte terminal, Tuple<SerializableElement, byte> previousValue,
                                                 Tuple<SerializableElement, byte> newValue)
        {
            if (previousValue != null)
            {
                previousValue.Item1.LayoutChanged -= BindedElementLayoutChanged;
                previousValue.Item1.ElementDeleted -= BindedElementDeleted;
                previousValue.Item1.ElementTerminalDeleted -= BindedElementTerminalDeleted;
                //previousValue.Item1.AttachedWires[previousValue.Item2]
                previousValue.Item1.AttachedWires[previousValue.Item2].Remove(this);
            }

            if (newValue != null)
            {
                newValue.Item1.LayoutChanged += BindedElementLayoutChanged;
                newValue.Item1.ElementDeleted += BindedElementDeleted;
                newValue.Item1.ElementTerminalDeleted += BindedElementTerminalDeleted;
                //newValue.Item1.AttachedWires.Add(new Tuple<SerializableWire, byte>(this, terminal));
                newValue.Item1.PutAttachedWire(newValue.Item2, this);
            }

            WireBindingChanged?.Invoke(this, terminal, previousValue, newValue);
        }

        private void BindedElementTerminalDeleted(SerializableElement el, byte terminalNumber)
        {
            if (Bind0 != null)
                if ((Bind0.Item1 == el) && (Bind0.Item2 == terminalNumber)) Bind0 = null;

            if (Bind1 != null)
                if ((Bind1.Item1 == el) && (Bind1.Item2 == terminalNumber)) Bind1 = null;

        }

        public void BindedElementLayoutChanged(SerializableElement el)
        {
            raiseLayoutChanged();
        }

        

        public void updatePosition(Point2D newPosition, byte terminal)
        {
            if (terminal == 0)
            { PositionTerminal0 = newPosition; }
            else
            { PositionTerminal1 = newPosition; }
        }

        public void BindedElementDeleted(SerializableElement el)
        {
            if (Bind0!=null)
                if (Bind0.Item1 == el) Bind0 = null;

            if (Bind1!=null)
                if (Bind1.Item1 == el) Bind1 = null;
        }

        public void doBind(byte thisWireTerminal, SerializableElement element, byte elementTerminal)
        {
            if (thisWireTerminal == 0)
                Bind0 = new Tuple<SerializableElement, byte>(element, elementTerminal);
            else
                Bind1 = new Tuple<SerializableElement, byte>(element, elementTerminal);
        }

        public void unBind(byte thisWireTerminal)
        {
            if (thisWireTerminal == 0)
                Bind0 = null;
            else
                Bind1 = null;
        }

        public override string ToString()
        {
            return "Wire " + ElementName;
        }

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);
        }

        public bool isThisWireBoundedTo(SerializableElement el, byte terminalNumber)
        {
            if (Bind0 != null)
                if (Bind0.Item1 == el && Bind0.Item2 == terminalNumber)
                    return true;

            if (Bind1 != null)
                if (Bind1.Item1 == el && Bind1.Item2 == terminalNumber)
                    return true;

            return false;
        }

        public bool isThisWireBoundedTo(SerializableElement el)
        {
            if (Bind0 != null)
                if (Bind0.Item1 == el) return true;

            if (Bind1 != null)
                if (Bind1.Item1 == el) return true;

            return false;
        }

        public bool isThisWireBoundedToOtherWire(SerializableWire Wire)
        {
            if (isThisWireBoundedTo(Wire)) return true;
            if (Wire.isThisWireBoundedTo(this)) return true;

            var components1 = Wire.GetBoundedComponents;
            var components2 = this.GetBoundedComponents;

            foreach (var comp1 in components1)
                foreach (var comp2 in components2)
                    if ((comp1.Item1 == comp2.Item1) &&
                        (comp1.Item2 == comp2.Item2))
                        return true;

            return false;
        }



        public void moveTerminalRelative(byte terminalNumber, Point2D displacement)
        {
            if (terminalNumber == 0)
                PositionTerminal0 += displacement;
            else
                PositionTerminal1 += displacement;
        }
    }
}
