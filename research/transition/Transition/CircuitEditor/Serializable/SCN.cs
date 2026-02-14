using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.ParametersControls;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class SCN : SerializableComponent
    {
        public override string ElementLetter => "Q";
        public override string ElementType => "Switched Capacitor Network";

        public override byte QuantityOfTerminals
            { get => 2; set => throw new NotImplementedException(); }

        private bool positivePolarity;
        public bool PositivePolarity { get => positivePolarity;
            set { SetProperty(ref positivePolarity, value);
                raiseLayoutChanged();
                OnPropertyChanged("PolarityString");
            }
        }

        private decimal r;
        public decimal R { get => r; set {
                SetProperty(ref r, value);
                reCalculateC();
                OnPropertyChanged("ResistanceString");
                raiseLayoutChanged();
            } }

        private decimal c;
        public decimal C { get => c; set {
                SetProperty(ref c, value);
                reCalculateFs();
            } }

        private decimal fs;
        public decimal Fs { get => fs; set {
                SetProperty(ref fs, value);
                reCalculateC();
            } }

        public string PolarityString { get => PositivePolarity ? "+SCN" : "-SCN"; }
        public string ResistanceString { get { var converter = new DecimalEngrConverter();
                return (string)converter.Convert(R, null, null, null);
            } }

        public SCN() : base()
        {
            r = 1e3m;
            c = 1e-9m;
            fs = 1m / (r * c);

            PositivePolarity = true;

            ParametersControl = new SCNParametersControl(this);
            OnScreenElement = new OnScreenComponents.SCNScreen(this);
        }

        private void reCalculateC()
        {
            decimal newC = 1m / (R * Fs);
            SetProperty(ref c, newC, "C");
        }

        private void reCalculateFs()
        {
            decimal newFs = 1m / (R * C);
            SetProperty(ref fs, newFs, "Fs");
        }

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "R": R = (decimal)value; break;
                case "C": C = (decimal)value; break;
                case "Fs": Fs = (decimal)value; break;
                case "PositivePolarity": PositivePolarity = (bool)value; break;
            }
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            throw new NotImplementedException();
        }
    }
}
