using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.ParametersControls;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class Switch : SerializableComponent
    {
        public override string ElementLetter => "S";
        public override string ElementType => "Switch";

        /* obviously the terminal 0 is the common terminal */
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

        private byte QuantityOfStates => (byte)(QuantityOfTerminals - 1);

        public delegate void DelegateTerminalsChanged(byte oldQuantity, byte newQuantity);
        public event DelegateTerminalsChanged TerminalsChanged;

        private byte state;
        public byte State { get => state;
            set { SetProperty(ref state, value);
                raiseLayoutChanged();
            }
        }

        private decimal rClosed;
        public decimal RClosed { get => rClosed; set {
                SetProperty(ref rClosed, value); } }

        private decimal cOpen;
        public decimal COpen { get => cOpen; set {
                SetProperty(ref cOpen, value); } }

        public decimal GClosed => 1 / RClosed;

        public ComplexDecimal GOpen(decimal frequency)
            { return ComplexDecimal.ImaginaryOne * 2 * DecimalMath.Pi * frequency * COpen; }

        public Switch() : base()
        {
            RClosed = 10e-3m;
            COpen = 1e-12m;
            QuantityOfTerminals = 3;
            State = 1;

            ParametersControl = new SwitchParametersControl(this);
            OnScreenElement = new OnScreenComponents.SwitchScreen(this);
        }

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "State":               State = (byte)value; break;
                case "QuantityOfTerminals": QuantityOfTerminals = (byte)value; break;
                case "RClosed":             RClosed = (decimal)value; break;
                case "COpen":               COpen = (decimal)value; break;
            }
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            var output = new ComplexDecimal[QuantityOfTerminals];

            if (State == 0 && terminal == 0)
            {
                output[0] = GOpen(frequency) * (QuantityOfTerminals - 1);
                for (byte x = 1; x < QuantityOfTerminals; x++)
                    output[x] = -GOpen(frequency);
            }
            else if (State == 0 && terminal != 0)
            {
                output[0] = -GOpen(frequency);
                output[terminal] = GOpen(frequency);
            }
            else if (state != 0 && terminal == 0)
            {
                output[0] = GOpen(frequency) * (QuantityOfTerminals - 2) + GClosed;
                for (byte x = 1; x < QuantityOfTerminals; x++)
                    output[x] = -GOpen(frequency);
                output[State] = -GClosed;
            }
            else if (state != 0 && terminal == State)
            {
                output[0] = -GClosed;
                output[terminal] = GClosed;
            }
            else if ((State != 0) && (terminal != State) && (terminal != 0))
            {
                output[0] = -GClosed;
                output[terminal] = GClosed;
            }

            return output;

        }
    }
}
