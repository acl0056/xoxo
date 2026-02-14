using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.ParametersControls;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class OpAmp : SerializableComponent, IPassive, IIsolateSection, IImplicitGroundedComponent
    {
        public override string ElementLetter => "U";
        public override string ElementType => "OpAmp";


        private decimal dcGain;
        public decimal DcGain { get => dcGain;
            set { SetProperty(ref dcGain, value); } /* in Times (not dB) */
        }

        private decimal phaseMargin;
        public decimal PhaseMargin { get => phaseMargin;
            set { SetProperty(ref phaseMargin, value); }
        }

        private decimal gainBandwidth;
        public decimal GainBandwidth { get => gainBandwidth;
            set { SetProperty(ref gainBandwidth, value); }
        }

        private decimal rIn;
        public decimal RIn { get => rIn;
            set { SetProperty(ref rIn, value); }
        }

       
        private decimal rOut;
        public decimal ROut { get => rOut;
            set { SetProperty(ref rOut, value); }
        }

        private decimal GIn => (1 / RIn);
        private decimal GOut => (1 / ROut);

        private string modelName;
        public string ModelName { get => modelName;
            set { SetProperty(ref modelName, value);
                raiseLayoutChanged();
            }
        }

        private string description;
        public string Description { get => description;
            set { SetProperty(ref description, value); }
        }

        public override byte QuantityOfTerminals { get => 3; set => throw new NotImplementedException(); }
        public ComplexDecimal GetImpedance(decimal frequency) => RIn;
        public Tuple<byte, byte> GetImpedanceTerminals => new Tuple<byte, byte>(0, 1);

     
        public OpAmp() : base()
        {
            GainBandwidth = 1e6m;
            DcGain = 100000;
            PhaseMargin = 45;
            RIn = 100e3m;
            ROut = 100;
            ModelName = "Default";
            Description = "Default OpAmp";

            ParametersControl = new OpAmpParametersControl(this);
            OnScreenElement = new OnScreenComponents.OpAmpScreen(this);

        }

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "GainBandwidth" : GainBandwidth = (decimal)value; break;
                case "DcGain"        : DcGain = (decimal)value; break;
                case "PhaseMargin"   : PhaseMargin = (decimal)value; break;
                case "RIn"           : RIn = (decimal)value; break;
                case "ROut"          : ROut = (decimal)value; break;
                case "ModelName"     : ModelName = (string)value; break;
                case "Description"   : Description = (string)value; break;
            }
        }

        public byte[] getOtherTerminalsIsolated(byte terminal)
        {
            if (terminal == 0) return new byte[] { 1 };
            else if (terminal == 1) return new byte[] { 0 };
            else
            {
                /* terminal == 2 */
                return new byte[] { };
            }
             
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            switch (terminal)
            {
                case 0: return new ComplexDecimal[3] { GIn, -GIn, 0 };
                case 1: return new ComplexDecimal[3] { -GIn, GIn, 0 };
                case 2: return new ComplexDecimal[3] { -GOut * DcGain, GOut * DcGain, GOut };
            }

            return new ComplexDecimal[3] { 0, 0, 0 };
        }
    }
}
