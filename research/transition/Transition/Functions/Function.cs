using Easycoustics.Transition.Common;
using Easycoustics.Transition.Design;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;
using Windows.UI;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Shapes;
using static Easycoustics.Transition.Design.UserDesign;

namespace Easycoustics.Transition.Functions
{
    public abstract class Function : BindableBase, ICloneable
    {
        private string title;
        public string Title { get => title; set { SetProperty(ref title, value); } }

        public abstract ComplexDecimal Calculate(decimal point);

        private Color strokeColor;
        public Color StrokeColor { get => strokeColor; set { SetProperty(ref strokeColor, value); } }

        private double strokeThickness;
        public double StrokeThickness { get => strokeThickness; set { SetProperty(ref strokeThickness, value); } }

        private DoubleCollection strokeArray;
        public DoubleCollection StrokeArray { get => strokeArray; set { SetProperty(ref strokeArray, value); } }

        public Color StrokeColorLighter { get {
                Color output;
                output.A = StrokeColor.A;
                output.R = Convert.ToByte(255 - ((255 - StrokeColor.R) / 2));
                output.G = Convert.ToByte(255 - ((255 - StrokeColor.G) / 2));
                output.G = Convert.ToByte(255 - ((255 - StrokeColor.B) / 2));
                return output; } }

        private string functionUnit;
        public string FunctionUnit { get => functionUnit; set { SetProperty(ref functionUnit, value); } } /* Volt, Pascal, Amper, Ohm, etc */

        private string variableUnit;
        public string VariableUnit { get => variableUnit; set { SetProperty(ref variableUnit, value); } } /* Hz, KHz., etc */

        private string functionQuantity;
        public string FunctionQuantity { get => functionQuantity; set { SetProperty(ref functionQuantity, value); } } /* Voltage, Current, Impedance, Pressure, Sec, etc.*/

        private string variableQuantity;
        public string VariableQuantity { get => variableQuantity; set { SetProperty(ref variableQuantity, value); } } /* Frequency, time, etc */

        public static string[] PhysicalUnits = new string[] {
            "Amper",
            "Kg",
            "Hz",
            "Joule",
            "Meter",
            "Newton",
            "Ohm",
            "Pascal",
            "Sec",
            "Tesla",
            "Volt",
            "Watt",
            ""
            };

        public static string[] PhysicalQuantities = new string[] {
            "Acceleration",
            "Acoustic Impedance",
            "Admittance",
            "Angular Frequency",
            "Area",
            "Electric Charge",
            "Electric Current",
            "Electric Voltage",
            "Energy",
            "Force",
            "Frequency",
            "Impedance",
            "Length",
            "Magnetic B",
            "Magnetic H",
            "Mass",
            "Mechanical Impedance",
            "Phase",
            "Power",
            "Pressure",
            "Ratio",
            "Reactance",
            "Resistance",
            "Time",
            "Velocity",
            "Volume",
            "Volume Velocity",
        };

        public event Action<Function, FunctionChangedEventArgs> FunctionChanged;
        
        public void RaiseFunctionChanged(FunctionChangedEventArgs args) => FunctionChanged?.Invoke(this, args);

        public abstract object Clone();

        
        public Function()
        {
            var rnd = new Random();

            variableUnit = "Hz";
            variableQuantity = "Frequency";
            StrokeColor = Color.FromArgb(255, (byte)rnd.Next(0, 255), (byte)rnd.Next(0, 255), (byte)rnd.Next(0, 255));
            StrokeThickness = 5;

        }

    }


    public class FunctionChangedEventArgs : EventArgs
    {
        public FunctionChangeAction Action;
        public decimal X;
        public ComplexDecimal Y;

        public enum FunctionChangeAction { PointChanged, PointAdded, PointRemoved, Reset }
    }


    public class ConstantValueFunction : Function
    {
        private ComplexDecimal fixedValue;
        public ComplexDecimal FixedValue
        {
            get => fixedValue;
            set
            {
                fixedValue = value;
                RaiseFunctionChanged(new FunctionChangedEventArgs()
                    { Action = FunctionChangedEventArgs.FunctionChangeAction.Reset });
            }
        }
        

        public ConstantValueFunction(ComplexDecimal fixedValue) : base()
        {
            FixedValue = fixedValue;
        }

        public override ComplexDecimal Calculate(decimal point)
        {
            return FixedValue;
        }
        

        public override object Clone()
        {
            var output = new ConstantValueFunction(fixedValue)
            {
                FunctionQuantity = this.FunctionQuantity,
                FunctionUnit = this.FunctionUnit,
                StrokeArray = this.StrokeArray,
                StrokeThickness = this.StrokeThickness,
                StrokeColor = this.StrokeColor,
                Title = this.Title,
                VariableQuantity = this.VariableQuantity,
                VariableUnit = this.VariableUnit
            };

            return output;
        }
    }





    public struct DataPoint : ICloneable
    {
        public decimal X { get; set; }
        public ComplexDecimal Y { get; set; }

        public object Clone()
        {
            return new DataPoint() { X = X, Y = Y };
        }
    }



    public class SampledFunction : Function, INotifyPropertyChanged, ICloneable
    {
       public List<DataPoint> Data { get; } = new List<DataPoint>();
        
        public InterpolationModes InterpolationMode = InterpolationModes.Linear;
       // public AxisScale VariableScale { get; set; }
       
        /* (Data collection must be ordered by domain/frequency/Item1, asc) */
        public decimal GetMinimumDomain => Data.First().X;
        public decimal GetMaximumDomain => Data.Last().X;

        public decimal getMaximumMagnitude => Data.Max(point => point.Y.Magnitude);
        public decimal getMinimumMagnitude => Data.Min(point => point.Y.Magnitude);

        public SampledFunction() : base()
        {
          
        }

        public SampledFunction(Function other)
        {
            FunctionQuantity = other.FunctionQuantity;
            FunctionUnit = other.FunctionUnit;
            VariableQuantity = other.VariableQuantity;
            VariableUnit = other.VariableUnit;
            StrokeArray = other.StrokeArray;
            StrokeThickness = other.StrokeThickness;
            StrokeColor = other.StrokeColor;
            Title = other.Title;
        }

        public void Clear()
        {
            Data.Clear();
        }

        public override ComplexDecimal Calculate(decimal point)
        {
            if (pointExistsInDomain(point))
                return getPointValue(point); 
            else
                return Interpolate(point);
            

        }

        public bool pointExistsInDomain(decimal point)
        {
            var output = Data.Where(data => data.X == point).ToList();

            return (output.Count != 0);
        }

        public ComplexDecimal Interpolate(decimal point)
        {
            return Interpolate(point, InterpolationMode);
        }

        public ComplexDecimal Interpolate(decimal point, InterpolationModes interpolationMode)
        {
            if (interpolationMode == InterpolationModes.NearestNeighbor)
                return InterpolateNearestNeighbor(point);
            else
            if (interpolationMode == InterpolationModes.Linear)
                return InterpolateLinear(point);
            else
            if (interpolationMode == InterpolationModes.Quadratic)
                return InterpolateQuadratic(point);
            else
                return InterpolateCubic(point);
        }

        public DataPoint GetNextPoint(decimal point)
        {
       
            var current = decimal.MaxValue;
            var output = new DataPoint();


            foreach (var p in Data)
                if ((p.X > point) && (p.X < current))
                {
                    current = p.X;
                    output = p;
                }

            if (current == decimal.MaxValue)
                throw new ArgumentException();

            return output;
        }

        public DataPoint GetPreviuosPoint(decimal point)
        {
            var current = decimal.MinValue;
            var output = new DataPoint();


            foreach (var p in Data)
                if ((p.X < point) && (p.X > current))
                {
                    current = p.X;
                    output = p;
                }


            if (current == decimal.MinValue)
                throw new ArgumentException(); 

            return output;
        }
        
        public bool isThereNextPoint(decimal point)
        {
            try { var x = GetNextPoint(point); }
            catch { return false; }
            return true;
        }

        public bool isTherePreviousPoint(decimal point)
        {
            try { var x = GetPreviuosPoint(point); }
            catch { return false; }
            return true;
        }

        public bool isPointOutsideRange(decimal point)
        {
            if (Data.Count == 0) return true;
            if (!isThereNextPoint(point)) return true;
            if (!isTherePreviousPoint(point)) return true;

            return false;
        }

        public ComplexDecimal getValueOutsideRange(decimal point)
        {
            if (Data.Count == 0) throw new InvalidOperationException();
            
            bool ThereIsNextAbscissa = isThereNextPoint(point);
            bool ThereIsPreviousAbscissa = isTherePreviousPoint(point);
            
            if (!ThereIsPreviousAbscissa)
                return GetNextPoint(point).Y;
            else
                return GetPreviuosPoint(point).Y;
                

        }

        private ComplexDecimal InterpolateNearestNeighbor(decimal point)
        {
            if (Data.Count < 1) throw new InvalidOperationException();

            if (isPointOutsideRange(point)) return getValueOutsideRange(point);
          
            var distanceToNext = GetNextPoint(point).X - point;
            var distanceToPrevious = point - GetPreviuosPoint(point).X;

            if (distanceToNext < distanceToPrevious)
                return GetNextPoint(point).Y;
            else
                return GetPreviuosPoint(point).Y;
        }

        private ComplexDecimal InterpolateLinear(decimal x)
        {
            if (Data.Count < 2) throw new InvalidOperationException();

            if (isPointOutsideRange(x)) return getValueOutsideRange(x);

            var x1 = GetPreviuosPoint(x).X;
            var x2 = GetNextPoint(x).X;
           
            var y1 = GetPreviuosPoint(x).Y;
            var y2 = GetNextPoint(x).Y;

            return y1 + ((x - x1) * (y2 - y1) / (x2 - x1));
        }

        private DataPoint? getPoint(decimal abscissa)
        {
            var list = Data.Where(p => p.X == abscissa).ToList();

            if (list.Count != 0) return list[0]; else return null;
        }

        private int getPointIndex(decimal point)
        {
            int output = 0;

            var sortedKeys = getSortedKeys();

            foreach (var k in sortedKeys)
                if (k == point) return output; else output++;

            return -1;
        }

        private ComplexDecimal getPointValue(decimal point)
        {
            var output = Data.Where(tup => tup.X == point).ToList();

            if (output.Count != 0) return output[0].Y;

            throw new InvalidOperationException();
        }
        

        private List<decimal> getSortedKeys()
        {
            var sortedKeys = new List<decimal>();

            foreach (var tup in Data)
                sortedKeys.Add(tup.X);

            sortedKeys.Sort();

            return sortedKeys;
        }

        private ComplexDecimal InterpolateQuadratic(decimal x)
        {
            if (Data.Count < 3) throw new InvalidOperationException();
            
            if (isPointOutsideRange(x)) return getValueOutsideRange(x);

            var p1 = GetPreviuosPoint(x);
            var p2 = GetNextPoint(x);


           /* var b = ComplexDecimal.Log(p2.Y / p1.Y) / ComplexDecimal.Log(p2.X / p1.X);
              var a = p1.Y / (ComplexDecimal.Pow(p1.X, b));

            output = a * ComplexDecimal.Pow(x,b);
            */

            return (p1.Y / (ComplexDecimal.Pow(p1.X, ComplexDecimal.Log(p2.Y / p1.Y) / ComplexDecimal.Log(p2.X / p1.X)))) * ComplexDecimal.Pow(x, ComplexDecimal.Log(p2.Y / p1.Y) / ComplexDecimal.Log(p2.X / p1.X));

           

        }

        private ComplexDecimal InterpolateSpline(decimal x)
        {
            if (Data.Count < 3) throw new InvalidOperationException();

            if (isPointOutsideRange(x)) return getValueOutsideRange(x);
            
            var t0 = GetPreviuosPoint(x).X;
            var t1 = GetNextPoint(x).X;
            var y0 = GetPreviuosPoint(x).Y; 
           
            var index0 = getPointIndex(t0);
            var index1 = getPointIndex(t1);

            var sortedKeys = getSortedKeys();

            var quantityOfPoints = sortedKeys.Count;

            ComplexDecimal z0 = 0;
            ComplexDecimal z1 = 0;

            int currentIndex = 0;

            while (currentIndex <= index0)
            {
                z0 = z1;
                z1 = (-1 * z0) + 2 * ((Data[currentIndex + 1].Y - Data[currentIndex].Y) / (Data[currentIndex + 1].X - Data[currentIndex].X));
                currentIndex++;
            }

            ComplexDecimal output = ((z1 - z0) / (2 * (t1 - t0)));
            output *= (x - t0) * (x - t0);
            output += z0 * (x - t0);
            output += y0;

            return output;
        }

        private ComplexDecimal InterpolateCubic(decimal point)
        {
            return 0;
        }

        public void addSample(decimal abscissa, ComplexDecimal value)
        {
            Data.Add(new DataPoint { X = abscissa, Y = value });
        }

        public bool removeSample(decimal abscissa)
        {
            var point = getPoint(abscissa);
            if (point != null) { Data.Remove((DataPoint)point); return true; }else
            return false;
        }

       /*
        public bool isCompatible(decimal minimumDomain, decimal maximumDomain, int quantityOfPoints, AxisScale scale)
        {
            if (Data.Count == 0) return false;

            if (GetMinimumDomain != minimumDomain) return false;
           // if (GetMaximumDomain != maximumDomain) return false;

            if (Data.Count != quantityOfPoints) return false;
            if (VariableScale != scale) return false;

            return true;
        }



        public bool isCompatible(SampledFunction func2)
        {
            /* if the two curves have the same domain points, we say they are compatible */
            /*
            if (Data.Count != func2.Data.Count) return false;
            if (GetMinimumDomain != func2.GetMinimumDomain) return false;
            if (VariableScale != func2.VariableScale) return false;

            return true;
        }*/

        /*
        public void AdaptFunctionTo(decimal minimumDomain, decimal maximumDomain, uint quantityOfPoints, AxisScale scale)
        {
            var ObjectivePoints = UserDesign.getFrequencyPoints(scale, maximumDomain, minimumDomain, quantityOfPoints);

            var toDelete = new List<DataPoint>();

            foreach (var obs in Data)
                if (!ObjectivePoints.Contains(obs.X))
                    toDelete.Add(obs);

            foreach (var del in toDelete)
                Data.Remove(del);

        }*/
        
        public override object Clone()
        {
            var output = new SampledFunction(this);
            
            output.InterpolationMode = InterpolationMode;

            foreach (var sample in Data)
                output.Data.Add((DataPoint)sample.Clone());
            
            return output;
        }

        public static SampledFunction RenderFunction(Function function, decimal minimum, decimal maximum, uint quantityOfPoints, AxisScale scale)
        {
            var points = UserDesign.getFrequencyPoints(scale, maximum, minimum, quantityOfPoints);

            var output = new SampledFunction(function);

            foreach (var point in points)
                output.Data.Add(new DataPoint() { X = point, Y = function.Calculate(point) });

            return output;

        }

        public static SampledFunction RenderFunction(Function function)
        {
            return RenderFunction(function, CurrentDesign.AnalysisParameters.AnalysisMinimumFrequency,
                                            CurrentDesign.AnalysisParameters.AnalysisMaximumFrequency,
                                            CurrentDesign.AnalysisParameters.AnalysisQuantityOfFrequencyPoints,
                                            CurrentDesign.AnalysisParameters.AnalysisFrequencyScale);
        }

    }

   
 

}
 