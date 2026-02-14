using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Components;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Functions;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class VoltageSource : SerializableComponent, IVoltageSource
    {
        public override string ElementLetter => "V";
        public override string ElementType => "Voltage Source";

        public override byte QuantityOfTerminals { get => 2; set => throw new NotImplementedException(); }

        public byte PositiveTerminal => 0;
        public byte NegativeTerminal => 1;

        private int outputVoltageFunctionType; // 0=constant 1=curve
        public int OutputVoltageFunctionType
        {
            get { return outputVoltageFunctionType; }
            set { SetProperty(ref outputVoltageFunctionType, value);
                OnPropertyChanged("VoltageString");
            }
        }

        private int outputImpedanceFunctionType; // 0=constant 1=curve
        public int OutputImpedanceFunctionType
        {
            get { return outputImpedanceFunctionType; }
            set { SetProperty(ref outputImpedanceFunctionType, value); }
        }

        private decimal constantOutputVoltage;
        public decimal ConstantOutputVoltage
        {
            get { return constantOutputVoltage; }
            set { SetProperty(ref constantOutputVoltage, value);
                OnPropertyChanged("VoltageString");
            }
        }

        private Function functionOutputVoltage;
        public Function FunctionOutputVoltage
        {
            get { return functionOutputVoltage; }
            set { SetProperty(ref functionOutputVoltage, value); }
        }

        private decimal constantOutputImpedance;
        public decimal ConstantOutputImpedance
        {
            get { return constantOutputImpedance; }
            set { SetProperty(ref constantOutputImpedance, value); }
        }

        private Function functionOutputImpedance;
        public Function FunctionOutputImpedance
        {
            get { return functionOutputImpedance; }
            set { SetProperty(ref functionOutputImpedance, value); }
        }

        public VoltageSource() : base()
        {
            ConstantOutputVoltage = 1;
            ConstantOutputImpedance = 1e-6m;

            OnScreenElement = new VoltageSourceScreen(this);
            ParametersControl = new VoltageSourceComponentParameters(this);
            
        }

        public ComplexDecimal getSourceImpedance(decimal frequency)
        {
            return ConstantOutputImpedance;
        }

        public ComplexDecimal getSourceVoltage(decimal frequency)
        {
            return ConstantOutputVoltage;
        }

        private ComplexDecimal getSourceAdmittance(decimal frequency) => getSourceImpedance(frequency).Reciprocal;


        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "OutputVoltageFunctionType": OutputVoltageFunctionType = (int)value; break;
                case "OutputImpedanceFunctionType": OutputImpedanceFunctionType = (int)value; break;
                case "ConstantOutputVoltage": ConstantOutputVoltage = (decimal)value; break;
                case "FunctionOutputVoltage": FunctionOutputVoltage = (Function)value; break;
                case "ConstantOutputImpedance": ConstantOutputImpedance= (decimal)value; break;
                case "FunctionOutputImpedance": FunctionOutputImpedance = (Function)value; break;
            }
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            var output = new ComplexDecimal[2];

            byte otherTerminal = (terminal == 0) ? (byte)1 : (byte)0;

            output[terminal] = getSourceAdmittance(frequency);
            output[otherTerminal] = -getSourceAdmittance(frequency);

            return output;
        }

        public string VoltageString
        {
            get
            {
                if (OutputVoltageFunctionType == 0)
                    return ConstantOutputVoltage.ToString() + " V";
                else
                    return "Curve";
            }
        }

    }
}
