using Easycoustics.Transition.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Easycoustics.Transition.Design
{
    public class AnalysisParameters
    {
        private decimal analysisMinimumFrequency = 10;
        public decimal AnalysisMinimumFrequency
        {
            get => analysisMinimumFrequency;
            set
            {
                if (value > AnalysisMaximumFrequency)
                    throw new ArgumentException();
                analysisMinimumFrequency = value;
            }
        }


        private decimal analysisMaximumFrequency = 40000;
        public decimal AnalysisMaximumFrequency
        {
            get => analysisMaximumFrequency;
            set
            {
                if (value < AnalysisMinimumFrequency)
                    throw new ArgumentException();
                analysisMaximumFrequency = value;
            }
        }

        public uint AnalysisQuantityOfFrequencyPoints { get; set; } = 400;
        public AxisScale AnalysisFrequencyScale { get; set; } = AxisScale.Logarithmic;

    }
}
