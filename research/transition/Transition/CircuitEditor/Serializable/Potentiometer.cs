using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Components;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Functions;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class Potentiometer : SerializableComponent
    {
        public override string ElementLetter => "P";
        public override string ElementType => "Potentiometer";

        private decimal resistanceValue;
        public decimal ResistanceValue
        {
            get { return resistanceValue; }
            set
            {
                SetProperty(ref resistanceValue, value);
                OnPropertyChanged("ResistanceString");
                raiseLayoutChanged();
            }
        }
        
        private double cursorPositionValue; /* 0 is CCW, 100 is CW */
        public double CursorPositionValue
        {
            get { return cursorPositionValue; }
            set { SetProperty(ref cursorPositionValue, value); raiseLayoutChanged(); }
        }

        private double tapAPositionValue;
        public double TapAPositionValue
        {
            get { return tapAPositionValue; }
            set { SetProperty(ref tapAPositionValue, value);
                if (TapAPositionValue > TapBPositionValue)
                    TapBPositionValue = TapAPositionValue;
                if (TapAPositionValue > TapCPositionValue)
                    TapCPositionValue = TapAPositionValue;
            }
        }

        private double tapBPositionValue;
        public double TapBPositionValue
        {
            get { return tapBPositionValue; }
            set { SetProperty(ref tapBPositionValue, value);
                if (TapBPositionValue < TapAPositionValue)
                    TapAPositionValue = TapBPositionValue;

                if (TapBPositionValue > TapCPositionValue)
                    TapCPositionValue = TapBPositionValue;
            }
        }

        private double tapCPositionValue;
        public double TapCPositionValue
        {
            get { return tapCPositionValue; }
            set { SetProperty(ref tapCPositionValue, value);
                if (TapCPositionValue < TapAPositionValue)
                    TapAPositionValue = TapCPositionValue;
                if (TapCPositionValue < TapBPositionValue)
                    TapBPositionValue = TapCPositionValue;
            }
        }

        private Precision componentPrecision;
        public Precision ComponentPrecision
        {
            get { return componentPrecision; }
            set { SetProperty(ref componentPrecision, value);
                OnPropertyChanged("ResistanceString"); }
        }

        public bool AnyPrecisionSelected { get { return (ComponentPrecision == Precision.Arbitrary); } }

        private SampledFunction taperFunction; /* this function MUST be monothonic */
        public SampledFunction TaperFunction
        {
            get { return taperFunction; }
            set { taperFunction = value;
                  TaperChanged?.Invoke();
            }
        }

        private List<Tuple<byte, decimal>> OrderedResistances { get; set; } = new List<Tuple<byte, decimal>>();


        /* Potentiometer allows to change the quantity
         of terminals, because it can have taps at determined points
         of its path , taps can be specified in the actual element */

        private byte quantityOfTerminals;
        public override byte QuantityOfTerminals { get { return quantityOfTerminals; }
            set
            {
                byte oldValue = quantityOfTerminals;
                SetProperty(ref quantityOfTerminals, value);
                TerminalsChanged?.Invoke(oldValue, value);

                if (value < oldValue)
                    for (byte x = oldValue; x > value; x--)
                        raiseTerminalDeleted((byte)(x - 1));

                raiseLayoutChanged();
            } }

        private byte PracticalQuantityOfTerminals => (isCursorObfuscated() == 255) ? QuantityOfTerminals : (byte)(QuantityOfTerminals - 1);

        /*
         terminal 0: CCW Extreme
         terminal 1: CW Extreme
         terminal 2: Cursor
         terminal 3: midpoint
         terminal 4: midpoint
         terminal 5: midpoint
         (midpoints are always ordered and monothonic)
             */

        public delegate void DelegateTerminalsChanged(byte oldQuantity, byte newQuantity);
        public event DelegateTerminalsChanged TerminalsChanged;

        public delegate void DelegateTaperChanged();
        public event DelegateTaperChanged TaperChanged;

        public Potentiometer() : base()
        {
            // potentiometer always start as the simplest form, 3 terminal
            // later can be changed by the user to 4, 5 or 6 terminal
            // ( added terminals are tap connections )

            quantityOfTerminals = 3;

            resistanceValue = 1e3m;
            cursorPositionValue = 50;

            taperFunction = new SampledFunction() { InterpolationMode = InterpolationModes.Linear};
            taperFunction.addSample(0, 0);
            taperFunction.addSample(100, 100);
            
            OnScreenElement = new PotentiometerScreen(this);
            ParametersControl = new PotentiometerParametersControl(this);

            updateResistances();
        }

        public string ResistanceString
        {
            get
            {
                // this one sets the String for the component in the schematic window
                string returnString;
                var conv = new DecimalEngrConverter() { ShortString = false };
                var convShort = new DecimalEngrConverter() { ShortString = true };

                if (AnyPrecisionSelected)
                    returnString = (string)conv.Convert(ResistanceValue, typeof(string), null, "");
                else
                    returnString = (string)convShort.Convert(ResistanceValue, typeof(string), null, "");

                return returnString + "Ω";
            }
        }

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "ResistanceValue"    : ResistanceValue     = (decimal)value;         break;
                case "PositionValue"      : CursorPositionValue = (double)value;          break;
                case "ComponentPrecision" : ComponentPrecision  = (Precision)value;       break;
                case "TapAPositionValue"  : TapAPositionValue   = (double)value;          break;
                case "TapBPositionValue"  : TapBPositionValue   = (double)value;          break;
                case "TapCPositionValue"  : TapCPositionValue   = (double)value;          break;
                case "TaperFunction"      : TaperFunction       = (SampledFunction)value; break;
            }

            updateResistances();
            
        }

        private void updateResistances()
        {
          
            Func<double, decimal> getResistance = (position) => {

                var ResistancePercent = TaperFunction.Calculate((decimal)position);
                return ResistancePercent.RealPart / 100 * ResistanceValue;
            };

            var list = new List<Tuple<byte,decimal>>();

            //list.Add(new Tuple<byte, decimal>(0, 0));
            //list.Add(new Tuple<byte, decimal>(1, getResistance(100d)));

            if (isCursorObfuscated() == 255) list.Add(new Tuple<byte, decimal>(2, getResistance(CursorPositionValue)));

            if (QuantityOfTerminals == 3) { }
            else if (QuantityOfTerminals == 4)
            {
                list.Add(new Tuple<byte, decimal>(3, getResistance(TapBPositionValue)));
            }
            else if (QuantityOfTerminals == 5)
            {
                list.Add(new Tuple<byte, decimal>(3, getResistance(TapAPositionValue)));
                list.Add(new Tuple<byte, decimal>(4, getResistance(TapCPositionValue)));
            }
            else
            { /* QuantityOfTerminals == 6 */
                list.Add(new Tuple<byte, decimal>(3, getResistance(TapAPositionValue)));
                list.Add(new Tuple<byte, decimal>(4, getResistance(TapBPositionValue)));
                list.Add(new Tuple<byte, decimal>(5, getResistance(TapCPositionValue)));
            }


            OrderedResistances.Clear();
            OrderedResistances.Add(new Tuple<byte, decimal>(0, 0));
            OrderedResistances.AddRange(list.OrderBy(t => t.Item2).ToList());
            OrderedResistances.Add(new Tuple<byte, decimal>(1, getResistance(100d)));
           
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
           
            var output = new ComplexDecimal[QuantityOfTerminals];
            
            if (terminal == 0)
            {   /* CCW extreme */
                var res = OrderedResistances[1];

                output[0] = new ComplexDecimal(res.Item2).Reciprocal;
                output[res.Item1] = -1 * new ComplexDecimal(res.Item2).Reciprocal;
            }
            else if (terminal == 1)
            {   /* CW extreme */
                var resAbove = OrderedResistances[OrderedResistances.Count - 2];
                var resistance = ResistanceValue - resAbove.Item2;

                output[1] = new ComplexDecimal(resistance).Reciprocal;
                output[resAbove.Item1] = -1 * new ComplexDecimal(resistance).Reciprocal;

            } else
            {
                /* cursor or midpoint terminal */
                /* selected terminal has two resistances attached, one above and one below */

                var res = OrderedResistances.Find(tup => (tup.Item1 == terminal));
                var index = OrderedResistances.IndexOf(res);

                var resAbove = OrderedResistances[index - 1];
                var resBelow = OrderedResistances[index + 1];

                var resistance1 = res.Item2 - resAbove.Item2;
                var resistance2 = resBelow.Item2 - res.Item2;
                /*
                output[terminal] = (1 / resistance1) + (1 / resistance2);
                output[resAbove.Item1] = -1 * (1 / resistance1);
                output[resBelow.Item1] = -1 * (1 / resistance2);
                */
                output[terminal] = new ComplexDecimal(resistance1).Reciprocal + new ComplexDecimal(resistance2).Reciprocal;
                output[resAbove.Item1] = -1 * new ComplexDecimal(resistance1).Reciprocal;
                output[resBelow.Item1] = -1 * new ComplexDecimal(resistance2).Reciprocal;
            }
            
            
            return output;
        }

        public byte isCursorObfuscated()
        {
            /* this is weird.
             
            a huge problem arose with potentiometers, when the cursor is in the exact position
            of other terminal, like a tap, or one of the extremes (CW or CCW)
            resistance between the cursor and the colliding terminal becomes zero, and admittance
            goes to infinity, breaking up the calculations in the matrix
            so we need a solution for this particular condition.

            when the cursor is in the same position of a fixed terminal, we say the cursor is obfuscated
            and the electric node of the cursor must be tied up with the node of the other colliding fixed terminal
             */
            return cursorWillBeObfuscated(CursorPositionValue);
           
        }

        public byte cursorWillBeObfuscated(double newValue)
        {
            if (newValue == 0) return 0;
            else if (newValue == 100) return 1;
            else if (QuantityOfTerminals == 4 && newValue == TapBPositionValue) return 3;
            else if (QuantityOfTerminals == 5 && newValue == TapAPositionValue) return 3;
            else if (QuantityOfTerminals == 5 && newValue == TapCPositionValue) return 4;
            else if (QuantityOfTerminals == 6 && newValue == TapAPositionValue) return 3;
            else if (QuantityOfTerminals == 6 && newValue == TapBPositionValue) return 4;
            else if (QuantityOfTerminals == 6 && newValue == TapCPositionValue) return 5;
            else return 255;
        }
    }
    
}
