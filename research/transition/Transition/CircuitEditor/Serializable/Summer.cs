using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.ParametersControls;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class Summer : SerializableComponent, IPassive, IIsolateSection, IImplicitGroundedComponent
    {
        public override string ElementLetter => "E";
        public override string ElementType => "Summer";

        /* all inputs and the output, are all ground referenced. */

        private byte quantityOfTerminals;
        public override byte QuantityOfTerminals
        {
            get { return quantityOfTerminals; }
            set
            {
                byte oldValue = quantityOfTerminals;
                SetProperty(ref quantityOfTerminals, value);
                TerminalsChanged?.Invoke(oldValue, value);

                if (value < oldValue)
                    for (byte x = oldValue; x > value; x--)
                        raiseTerminalDeleted((byte)(x - 1));

                raiseLayoutChanged();
            }
        }

        private decimal rIn;
        public decimal RIn
        {
            get => rIn;
            set { SetProperty(ref rIn, value); }
        }

        private decimal rOut;
        public decimal ROut
        {
            get => rOut;
            set { SetProperty(ref rOut, value); }
        }

        private decimal GIn => 1 / RIn; /* G is Admittance, reciprocal of impedance */
        private decimal GOut => 1 / ROut;
        
        private bool inAInverterInput;
        public bool InAInverterInput
        {
            get => inAInverterInput;
            set { SetProperty(ref inAInverterInput, value);
                raiseLayoutChanged();
            }
        }

        private bool inBInverterInput;
        public bool InBInverterInput
        {
            get => inBInverterInput;
            set
            {
                SetProperty(ref inBInverterInput, value);
                raiseLayoutChanged();
            }
        }

        private bool inCInverterInput;
        public bool InCInverterInput
        {
            get => inCInverterInput;
            set
            {
                SetProperty(ref inCInverterInput, value);
                raiseLayoutChanged();
            }
        }

        public decimal InAPolarity => InAInverterInput ? -1 : 1;
        public decimal InBPolarity => InBInverterInput ? -1 : 1;
        public decimal InCPolarity => InCInverterInput ? -1 : 1;

        public Tuple<byte, byte> GetImpedanceTerminals => new Tuple<byte, byte>(0, 255);
        public ComplexDecimal GetImpedance(decimal frequency) => RIn;

        public delegate void DelegateTerminalsChanged(byte oldQuantity, byte newQuantity);
        public event DelegateTerminalsChanged TerminalsChanged;
        
        public Summer() : base()
        {
            rIn = 1e12m;
            rOut = 1e-6m;
            QuantityOfTerminals = 3;

            ParametersControl = new SummerParametersControl(this);
            OnScreenElement = new OnScreenComponents.SummerScreen(this);
        }

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "RIn": RIn = (decimal)value; break;
                case "ROut": ROut = (decimal)value; break;
                    
                case "InAInverterInput": InAInverterInput = (bool)value; break;
                case "InBInverterInput": InBInverterInput = (bool)value; break;
                case "InCInverterInput": InCInverterInput = (bool)value; break;
            }
        }

        public byte[] getOtherTerminalsIsolated(byte terminal)
        {
            return new byte[] { }; /* this component isolates sections from with ALL its terminals */
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            if (QuantityOfTerminals == 3)
            {
                switch (terminal)
                {
                    case 0: return new ComplexDecimal[3] { GOut, -InAPolarity * GOut, -InBPolarity * GOut };
                    case 1: return new ComplexDecimal[3] { 0, GIn, 0 };
                    case 2: return new ComplexDecimal[3] { 0, 0, GIn };
                }
            }
            else
            {
                switch (terminal)
                {
                    case 0: return new ComplexDecimal[4] { GOut, -InAPolarity * GOut, -InBPolarity * GOut, -InCPolarity * GOut };
                    case 1: return new ComplexDecimal[4] { 0, GIn, 0, 0 };
                    case 2: return new ComplexDecimal[4] { 0, 0, GIn, 0 };
                    case 3: return new ComplexDecimal[4] { 0, 0, 0, GIn };
                }
            }
            return new ComplexDecimal[1] { 0 };
        }
    }
}

