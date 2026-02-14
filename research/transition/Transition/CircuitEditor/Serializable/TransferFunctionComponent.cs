using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.ParametersControls;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Functions;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class TransferFunctionComponent : SerializableComponent, IPassive, IIsolateSection
    {
        public override string ElementLetter => "H";
        public override string ElementType => "Transfer Function";

        public override byte QuantityOfTerminals { get => 4; set => throw new NotImplementedException(); }
        public ComplexDecimal GetImpedance(decimal frequency) => RIn;
        public Tuple<byte, byte> GetImpedanceTerminals => new Tuple<byte, byte>(0, 1);

        private decimal rIn;
        public decimal RIn
        {
            get => rIn;
            set { SetProperty(ref rIn, value); } }

        private decimal rOut;
        public decimal ROut
        {
            get => rOut; set { SetProperty(ref rOut, value); }
        }

        private decimal GIn => 1 / RIn;
        private decimal GOut => 1 / ROut;

        private Function customTF;
        public Function CustomTF
        {
            get => customTF;
            set { SetProperty(ref customTF, value);
                raiseLayoutChanged(); }
        }

        private int functionType;   /* 0=standard, 1=custom curve, 2=laplace expression */
        public int FunctionType { get => functionType;
            set { SetProperty(ref functionType, value);
                raiseLayoutChanged();
                OnPropertyChanged("TFString");
            }
        }

        public StandardTransferFunction StandardTf = new StandardTransferFunction();

        public string TFString { get {
                if (FunctionType == 0) return StandardFunction;
                else
                if (FunctionType == 1) return "Custom";
                else
                    return "Laplace";
            } }

        public string StandardFunction
        {
            get => StandardTf.CurrentFunction;
            set
            {
                StandardTf.CurrentFunction = value;
                OnPropertyChanged("StandardFunction");
                OnPropertyChanged("TFString");
                raiseLayoutChanged();
            }
        }


        public decimal Ao
        {
            get => StandardTf.Ao; set
            {
                StandardTf.Ao = value;
                OnPropertyChanged("Ao");
            }
        }

        public decimal Fp
        {
            get => StandardTf.Fp; set
            {
                StandardTf.Fp = value;
                OnPropertyChanged("Fp");
            }
        }

        public decimal Fz
        {
            get => StandardTf.Fz; set
            {
                StandardTf.Fz = value;
                OnPropertyChanged("Fz");
            }
        }

        public decimal Qp
        {
            get => StandardTf.Qp; set
            {
                StandardTf.Qp = value;
                OnPropertyChanged("Qp");
            }
        }

        public bool Invert
        {
            get => StandardTf.Invert; set
            {
                StandardTf.Invert = value;
                OnPropertyChanged("Invert");
            }
        }

        public bool Reverse
        {
            get => StandardTf.Reverse; set
            {
                StandardTf.Reverse = value;
                OnPropertyChanged("Reverse");
            }
        }

        public LaplaceFunction laplaceTf;
      
        public TransferFunctionComponent() : base()
        {
            rIn = 1e12m;
            rOut = 1e-6m;

            Ao = 1m;
            Fp = 1e3m;
            Fz = 1e3m;
            Qp = 1m;

            StandardFunction = "LP1";

            Invert = false;
            Reverse = false;

            functionType = 0;

            ParametersControl = new TransferFunctionParametersControl(this);
            OnScreenElement = new OnScreenComponents.TransferFunctionScreen(this);
        }


        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "RIn": RIn = (decimal)value; break;
                case "ROut": ROut = (decimal)value; break;

                case "Ao": Ao = (decimal)value; break;
                case "Fp": Fp = (decimal)value; break;
                case "Fz": Fz = (decimal)value; break;
                case "Qp": Qp = (decimal)value; break;

                case "Invert": Invert = (bool)value; break;
                case "Reverse": Reverse = (bool)value; break;

                case "FunctionType": FunctionType = (int)value; break;
                case "StandardFunction": StandardFunction = (string)value; break;

            }
        }

        public byte[] getOtherTerminalsIsolated(byte terminal)
        {
            if (terminal == 0) return new byte[] { 1 };
            else if (terminal == 1) return new byte[] { 0 };
            else if (terminal == 2) return new byte[] { 3 };
            else /* terminal == 3*/ return new byte[] { 2 };

        }

        public Function SelectedTransferFunction { get
            {
                if (FunctionType == 0) return StandardTf;
                if (FunctionType == 1) return CustomTF;
                return null;
            }
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            ComplexDecimal H = SelectedTransferFunction.Calculate(frequency);

            if (terminal == 0)
            { return new ComplexDecimal[4] { GIn, -GIn, 0, 0 }; }
            else if (terminal == 1)
            { return new ComplexDecimal[4] { -GIn, GIn, 0, 0 }; }
            else if (terminal == 2)
            { return new ComplexDecimal[4] { -GOut * H, GOut * H, GOut, -GOut }; }
            else /*  terminal == 3 */
            { return new ComplexDecimal[4] { GOut * H, -GOut * H, -GOut, GOut }; }

        }
    }
}
