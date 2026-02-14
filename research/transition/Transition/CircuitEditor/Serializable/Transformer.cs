using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Components;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class Transformer : SerializableComponent, IIsolateSection
    {
        public override string ElementLetter => "T";
        public override string ElementType => "Transformer";

      
        private decimal turnsRatio;
        public decimal TurnsRatio
        {
            get { return turnsRatio; }
            set { SetProperty(ref turnsRatio, value);
                changeTR();
            }
        }
     
        private double kCouplingCoef;
        public double KCouplingCoef
        {
            get { return kCouplingCoef; }
            set { SetProperty(ref kCouplingCoef, value);
                updateM();
            }
        }

        private decimal lpri;
        public decimal Lpri
        {
            get { return lpri; }
            set
            {
                SetProperty(ref lpri, value);
                changeLpri();
            }
        }

        private decimal lsec;
        public decimal Lsec
        {
            get { return lsec; }
            set
            {
                SetProperty(ref lsec, value);
                changeLsec();
            }
        }

        private decimal mutualL;
        public decimal MutualL { get { return mutualL; }}

        private decimal lpLeak;
        public decimal LpLeak { get { return lpLeak; }}

        private decimal lsLeak;
        public decimal LsLeak { get { return lsLeak; }}

        public override byte QuantityOfTerminals { get => 4; set => throw new NotImplementedException(); }

        public Transformer() : base()
        {
         
            SetProperty(ref turnsRatio, 1m, "TurnsRatio");
            SetProperty(ref lpri, 1m, "Lpri");
            SetProperty(ref lsec, 1m, "Lsec");
            SetProperty(ref kCouplingCoef, 0.99, "KCouplingCoef");
            updateM();

            ParametersControl = new TransformerParametersControl(this);
            OnScreenElement = new OnScreenComponents.TransformerScreen(this);
        }

        private void changeTR()
        {

            decimal ls = TurnsRatio * TurnsRatio * Lpri;
            SetProperty(ref lsec, ls, "Lsec");
            updateM();
        }

        private void changeLpri()
        {
            decimal ls = TurnsRatio * TurnsRatio * Lpri;
            SetProperty(ref lsec, ls, "Lsec");
            updateM();
        }
        
        private void changeLsec()
        {
            decimal tr = DecimalMath.Sqrt(Lsec / Lpri);
            SetProperty(ref turnsRatio, tr, "TurnsRatio");
            updateM();
        }

        private void updateM()
        {
            double k = KCouplingCoef;

            SetProperty(ref mutualL, (decimal)k * DecimalMath.Sqrt(Lpri * Lsec), "MutualL");
            SetProperty(ref lpLeak, Lpri * (1 - (decimal)k), "LpLeak");
            SetProperty(ref lsLeak, Lsec * (1 - (decimal)k), "LsLeak");
        }

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "TurnsRatio": TurnsRatio = (decimal)value; break;
                case "KCouplingCoef": KCouplingCoef = (double)value; break;
                case "Lpri": Lpri = (decimal)value; break;
                case "Lsec": Lsec = (decimal)value; break;
            }
        }

        public byte[] getOtherTerminalsIsolated(byte terminal)
        {
            if (terminal == 0) return new byte[] { 1 };
            else if (terminal == 1) return new byte[] { 0 };
            else if (terminal == 2) return new byte[] { 3 };
            else return new byte[] { 2 };
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            decimal w = 2 * DecimalMath.Pi * frequency;
            var denom = w * ((MutualL * MutualL) - (Lpri * Lsec));
            var j = ComplexDecimal.ImaginaryOne;

            switch (terminal)
            {
                case 0:
                    return new ComplexDecimal[4] 
                { j * Lsec / denom, -j * Lsec / denom, -j * MutualL / denom, j * MutualL / denom };

                case 1:
                    return new ComplexDecimal[4]
                { -j * Lsec / denom, j * Lsec / denom, j * MutualL / denom, -j * MutualL / denom };

                case 2:
                    return new ComplexDecimal[4]
                { -j * MutualL / denom, j * MutualL / denom, j * Lpri / denom, -j * Lpri / denom };

                case 3:
                    return new ComplexDecimal[4]
                { j * MutualL / denom, -j * MutualL / denom, -j * Lpri / denom, j * Lpri / denom };

            }

            return null;
        }
    }
}
