using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.ParametersControls;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class Buffer : SerializableComponent, IPassive, IIsolateSection, IImplicitGroundedComponent
    {
        public override string ElementLetter => "B";
        public override string ElementType => "Buffer";

        public override byte QuantityOfTerminals { get => 2; set => throw new NotImplementedException(); }

        public ComplexDecimal GetImpedance(decimal frequency) => RIn;
        public Tuple<byte, byte> GetImpedanceTerminals => new Tuple<byte, byte>(0, 255);

       

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

        private decimal GIn => (1 / RIn);   //admitance
        private decimal GOut => (1 / ROut);

        private bool inverterInput;
        public bool InverterInput
        {
            get => inverterInput;
            set
            {
                SetProperty(ref inverterInput, value);
                raiseLayoutChanged();
            }
        }

        private int Polarity => (InverterInput) ? -1 : 1;

        private decimal gain; /* times */
        public decimal Gain
        {
            get => gain;
            set
            {
                SetProperty(ref gain, value);
                raiseLayoutChanged();
            }
        }

        private decimal delay; /* seconds */
        public decimal Delay
        {
            get => delay;
            set
            {
                SetProperty(ref delay, value);
                raiseLayoutChanged();
            }
        }
        

        public Buffer() : base()
        {
            rIn = 1e12m;
            rOut = 1e-6m;

            inverterInput = false;
            delay = 0;
            gain = 1;

            ParametersControl = new BufferParametersControl(this);
            OnScreenElement = new OnScreenComponents.BufferScreen(this);
        }

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "RIn": RIn = (decimal)value; break;
                case "ROut": ROut = (decimal)value; break;

                case "InverterInput": InverterInput = (bool)value; break;
                case "Gain": Gain = (decimal)value; break;
                case "Delay": Delay = (decimal)value; break;

            }
        }

        private ComplexDecimal TF(decimal frequency)
        {
            return Gain * ComplexDecimal.Exp(-1 * ComplexDecimal.ImaginaryOne * (2m * DecimalMath.Pi * frequency * Delay));
        }

        public byte[] getOtherTerminalsIsolated(byte terminal)
        {
            return new byte[] { };
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            switch (terminal)
            {
                case 0: return new ComplexDecimal[2] { GIn, 0 };
                case 1: return new ComplexDecimal[2] { -GOut * Polarity * TF(frequency), GOut };
            }

            return new ComplexDecimal[2] { 0, 0 };

        }
    }
}
